import { typeDefsSchema } from './schemas/index.js';
import { queriesSchema } from './schemas/queries.js';
import { mutationsSchema } from './schemas/mutations.js';
import { subscriptionsSchema } from './schemas/subscriptions.js';

// Combine all type definitions
export const typeDefs = `
  ${typeDefsSchema}
  ${queriesSchema}
  ${mutationsSchema}
  ${subscriptionsSchema}
`;
