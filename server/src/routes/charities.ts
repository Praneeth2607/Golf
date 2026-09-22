import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { recordAudit } from "../lib/audit";
import { ApiError } from "../middleware/errorHandler";

export const charitiesRouter = Router();
export const adminCharitiesRouter = Router();

const listQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  featured: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

// GET /api/charities — public directory, search + featured filter.
// Non-admins only ever see active charities.
charitiesRouter.get("/", async (req, res, next) => {
  try {
    const { q, featured } = listQuerySchema.parse(req.query);

    const charities = await prisma.charity.findMany({
      where: {
        isActive: true,
        ...(featured ? { isFeatured: true } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { summary: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
    });

    res.json({ charities });
  } catch (err) {
    next(err);
  }
});

// GET /api/charities/:slug — public detail page, with upcoming events.
charitiesRouter.get("/:slug", async (req, res, next) => {
  try {
    const charity = await prisma.charity.findUnique({
      where: { slug: req.params.slug },
      include: {
        events: { orderBy: { eventDate: "asc" }, where: { eventDate: { gte: new Date() } } },
      },
    });

    if (!charity || !charity.isActive) {
      throw new ApiError(404, "Charity not found");
    }

    res.json({ charity });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Admin charity management — mounted at /api/admin/charities
// ---------------------------------------------------------------------------

const charityInputSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  summary: z.string().min(1).max(300),
  description: z.string().min(1),
  logoUrl: z.string().url().nullable().optional(),
  coverImageUrl: z.string().url().nullable().optional(),
  websiteUrl: z.string().url().nullable().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

adminCharitiesRouter.use(requireAuth, requireRole("ADMIN"));

// GET /api/admin/charities — includes inactive charities, for management.
adminCharitiesRouter.get("/", async (_req, res, next) => {
  try {
    const charities = await prisma.charity.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: {
        events: { orderBy: { eventDate: "asc" } },
        _count: { select: { events: true, contributions: true } },
      },
    });
    res.json({ charities });
  } catch (err) {
    next(err);
  }
});

adminCharitiesRouter.post("/", async (req, res, next) => {
  try {
    const body = charityInputSchema.parse(req.body);
    const charity = await prisma.charity.create({ data: body });

    await recordAudit({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: "CHARITY_CREATED",
      entityType: "charity",
      entityId: charity.id,
      metadata: { name: charity.name },
    });

    res.status(201).json({ charity });
  } catch (err) {
    next(err);
  }
});

adminCharitiesRouter.put("/:id", async (req, res, next) => {
  try {
    const body = charityInputSchema.partial().parse(req.body);

    const charity = await prisma.charity.update({
      where: { id: req.params.id },
      data: body,
    });

    await recordAudit({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: "CHARITY_UPDATED",
      entityType: "charity",
      entityId: charity.id,
      metadata: body,
    });

    res.json({ charity });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/charities/:id — soft delete (deactivate). Charities are
// never hard-deleted once they might have contributions/donations pointing
// at them; deactivating removes them from the public directory and blocks
// new selections while preserving financial history.
adminCharitiesRouter.delete("/:id", async (req, res, next) => {
  try {
    const charity = await prisma.charity.update({
      where: { id: req.params.id },
      data: { isActive: false, isFeatured: false },
    });

    await recordAudit({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: "CHARITY_DEACTIVATED",
      entityType: "charity",
      entityId: charity.id,
    });

    res.json({ charity });
  } catch (err) {
    next(err);
  }
});

const eventInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  eventDate: z.coerce.date(),
  location: z.string().max(300).optional(),
});

adminCharitiesRouter.post("/:id/events", async (req, res, next) => {
  try {
    const body = eventInputSchema.parse(req.body);
    const event = await prisma.charityEvent.create({
      data: { ...body, charityId: req.params.id },
    });

    await recordAudit({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: "CHARITY_EVENT_CREATED",
      entityType: "charity_event",
      entityId: event.id,
      metadata: { charityId: req.params.id },
    });

    res.status(201).json({ event });
  } catch (err) {
    next(err);
  }
});

adminCharitiesRouter.delete("/:id/events/:eventId", async (req, res, next) => {
  try {
    await prisma.charityEvent.delete({ where: { id: req.params.eventId } });

    await recordAudit({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: "CHARITY_EVENT_DELETED",
      entityType: "charity_event",
      entityId: req.params.eventId,
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
