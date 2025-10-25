import { queryResolvers } from '../queries/index.js';
import { mutationResolvers } from '../mutations/index.js';
import { subscriptionResolvers } from '../subscriptions/index.js';
import { GraphQLScalarType, Kind } from 'graphql';

// Custom DateTime scalar
const dateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  serialize(value: any) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    throw Error('GraphQL DateTime Scalar serializer expected a `Date` object');
  },
  parseValue(value: any) {
    if (typeof value === 'string') {
      return new Date(value);
    }
    throw new Error('GraphQL DateTime Scalar parser expected a `string`');
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

// Combine all resolvers
export const resolvers = {
  DateTime: dateTimeScalar,
  ...queryResolvers,
  ...mutationResolvers,
  ...subscriptionResolvers,
};
