import { describe, expect, it, vi } from "vitest";
import { requireRole } from "./auth";
import type { Request, Response } from "express";

function mockRes() {
  const res = { statusCode: 0, body: undefined as unknown } as unknown as Response;
  res.status = vi.fn((code: number) => {
    (res as unknown as { statusCode: number }).statusCode = code;
    return res;
  }) as unknown as Response["status"];
  res.json = vi.fn((body: unknown) => {
    (res as unknown as { body: unknown }).body = body;
    return res;
  }) as unknown as Response["json"];
  return res;
}

describe("requireRole", () => {
  it("rejects with 401 when there's no authenticated user at all", () => {
    const req = {} as Request;
    const res = mockRes();
    const next = vi.fn();

    requireRole("ADMIN")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a SUBSCRIBER trying to reach an ADMIN-only route", () => {
    const req = { user: { id: "u1", email: "a@b.com", role: "SUBSCRIBER" } } as Request;
    const res = mockRes();
    const next = vi.fn();

    requireRole("ADMIN")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows an ADMIN through an ADMIN-only route", () => {
    const req = { user: { id: "u1", email: "a@b.com", role: "ADMIN" } } as Request;
    const res = mockRes();
    const next = vi.fn();

    requireRole("ADMIN")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("allows a role listed among several accepted roles", () => {
    const req = { user: { id: "u1", email: "a@b.com", role: "SUBSCRIBER" } } as Request;
    const res = mockRes();
    const next = vi.fn();

    requireRole("ADMIN", "SUBSCRIBER")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
