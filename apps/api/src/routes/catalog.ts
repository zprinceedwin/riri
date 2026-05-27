/**
 * Static clinic catalog endpoints -- the FE can render services + doctors
 * without a Couchbase round-trip. Backed by lib/clinic-catalog.ts.
 *   GET /api/services
 *   GET /api/doctors
 */
import { Hono } from "hono";
import type {
  ListDoctorsResponse,
  ListServicesResponse,
} from "@riri/shared";
import { DOCTORS, SERVICES } from "../lib/clinic-catalog.js";

export const catalogRoutes = new Hono();

catalogRoutes.get("/services", (c) => {
  const res: ListServicesResponse = { services: SERVICES };
  return c.json(res);
});

catalogRoutes.get("/doctors", (c) => {
  const res: ListDoctorsResponse = { doctors: DOCTORS };
  return c.json(res);
});
