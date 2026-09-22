import { app } from "./app";
import { env } from "./lib/env";

const port = Number(env.PORT);
app.listen(port, () => {
  console.log(`Digital Heroes API listening on port ${port}`);
});
