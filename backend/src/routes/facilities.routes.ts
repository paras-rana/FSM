import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { authorize } from "../middleware/authorize";
import { createCuidLikeId } from "../utils/id";

const createFacilitySchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  zipcode: z.string().min(1),
  contactInfo: z.string().min(1),
  zones: z.array(z.string().min(1)).min(1)
});
const updateFacilitySchema = createFacilitySchema;

type FacilityWithZones = {
  id: string;
  name: string;
  address: string;
  city: string;
  zipcode: string;
  contact_info: string;
  zones: string[];
};

const listFacilities = async (): Promise<FacilityWithZones[]> => {
  const { rows } = await pool.query(
    `SELECT
       f.id,
       f.name,
       f.address,
       f.city,
       f.zipcode,
       f.contact_info,
       COALESCE(array_agg(fz.name ORDER BY fz.name) FILTER (WHERE fz.name IS NOT NULL), '{}') AS zones
     FROM facilities f
     LEFT JOIN facility_zones fz ON fz.facility_id = f.id
     GROUP BY f.id
     ORDER BY f.name ASC`
  );
  return rows as FacilityWithZones[];
};

export const publicFacilitiesRouter = Router();
export const facilitiesRouter = Router();

publicFacilitiesRouter.get("/public", async (_req, res, next) => {
  try {
    const rows = await listFacilities();
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

facilitiesRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await listFacilities();
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

facilitiesRouter.post("/", authorize("ADMIN"), async (req, res, next) => {
  try {
    const parsed = createFacilitySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid payload" });
      return;
    }

    const uniqueZones = Array.from(new Set(parsed.data.zones.map((zone) => zone.trim()).filter(Boolean)));
    if (uniqueZones.length === 0) {
      res.status(400).json({ message: "At least one zone is required" });
      return;
    }

    const facilityId = createCuidLikeId();
    await pool.query(
      `INSERT INTO facilities (id, name, address, city, zipcode, contact_info)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        facilityId,
        parsed.data.name.trim(),
        parsed.data.address.trim(),
        parsed.data.city.trim(),
        parsed.data.zipcode.trim(),
        parsed.data.contactInfo.trim()
      ]
    );

    for (const zoneName of uniqueZones) {
      await pool.query(
        `INSERT INTO facility_zones (id, facility_id, name)
         VALUES ($1, $2, $3)`,
        [createCuidLikeId(), facilityId, zoneName]
      );
    }

    const rows = await listFacilities();
    const facility = rows.find((row) => row.id === facilityId);
    res.status(201).json(facility);
  } catch (error) {
    next(error);
  }
});

facilitiesRouter.put("/:id", authorize("ADMIN"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const parsed = updateFacilitySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid payload" });
      return;
    }

    const uniqueZones = Array.from(new Set(parsed.data.zones.map((zone) => zone.trim()).filter(Boolean)));
    if (uniqueZones.length === 0) {
      res.status(400).json({ message: "At least one zone is required" });
      return;
    }

    await client.query("BEGIN");
    const updateResult = await client.query(
      `UPDATE facilities
       SET name = $2, address = $3, city = $4, zipcode = $5, contact_info = $6, updated_at = now()
       WHERE id = $1`,
      [
        req.params.id,
        parsed.data.name.trim(),
        parsed.data.address.trim(),
        parsed.data.city.trim(),
        parsed.data.zipcode.trim(),
        parsed.data.contactInfo.trim()
      ]
    );
    if (updateResult.rowCount === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ message: "Facility not found" });
      return;
    }

    await client.query(`DELETE FROM facility_zones WHERE facility_id = $1`, [req.params.id]);
    for (const zoneName of uniqueZones) {
      await client.query(
        `INSERT INTO facility_zones (id, facility_id, name) VALUES ($1, $2, $3)`,
        [createCuidLikeId(), req.params.id, zoneName]
      );
    }
    await client.query("COMMIT");

    const rows = await listFacilities();
    const facility = rows.find((row) => row.id === req.params.id);
    res.json(facility);
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});
