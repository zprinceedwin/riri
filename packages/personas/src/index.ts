import { type Persona, PersonaSchema, type PersonaId } from "@riri/shared";
import jordanJson from "../jordan.json" with { type: "json" };
import mikeJson from "../mike.json" with { type: "json" };

const jordan: Persona = PersonaSchema.parse(jordanJson);
const mike: Persona = PersonaSchema.parse(mikeJson);

const personaRegistry: Record<PersonaId, Persona> = {
  jordan,
  mike,
};

export function getPersona(id: PersonaId): Persona {
  return personaRegistry[id];
}

export function listPersonas(): Persona[] {
  return Object.values(personaRegistry);
}

export function getPersonaIds(): PersonaId[] {
  return Object.keys(personaRegistry) as PersonaId[];
}

export { jordan, mike };
