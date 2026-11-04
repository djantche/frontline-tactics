import { z } from "zod";
import { tileSchema } from "./tile";
import { unitSchema } from "./unit";

const tileRowSchema = z.array(tileSchema).nonempty().max(99);

export const mapSchema = z.object({
  name: z.string().trim().min(1).max(60),
  tiles: z.array(tileRowSchema).nonempty().max(99),
  predeployedUnits: z.array(unitSchema),
});

export type CreatableMap = z.infer<typeof mapSchema>;
