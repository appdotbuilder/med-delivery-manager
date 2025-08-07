
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { 
  createUserInputSchema, 
  loginInputSchema,
  createPatientInputSchema,
  createOrderInputSchema,
  updateOrderStatusInputSchema,
  getUserOrdersInputSchema,
  getOrderTrackingInputSchema
} from './schema';
import { createUser } from './handlers/create_user';
import { login } from './handlers/login';
import { createPatient } from './handlers/create_patient';
import { getPatients } from './handlers/get_patients';
import { createOrder } from './handlers/create_order';
import { updateOrderStatus } from './handlers/update_order_status';
import { getUserOrders } from './handlers/get_user_orders';
import { getOrderTracking } from './handlers/get_order_tracking';
import { getCouriers } from './handlers/get_couriers';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),
  
  getCouriers: publicProcedure
    .query(() => getCouriers()),
  
  // Patient management
  createPatient: publicProcedure
    .input(createPatientInputSchema)
    .mutation(({ input }) => createPatient(input)),
  
  getPatients: publicProcedure
    .query(() => getPatients()),
  
  // Order management
  createOrder: publicProcedure
    .input(createOrderInputSchema)
    .mutation(({ input }) => createOrder(input)),
  
  updateOrderStatus: publicProcedure
    .input(updateOrderStatusInputSchema)
    .mutation(({ input }) => updateOrderStatus(input)),
  
  getUserOrders: publicProcedure
    .input(getUserOrdersInputSchema)
    .query(({ input }) => getUserOrders(input)),
  
  // Delivery tracking
  getOrderTracking: publicProcedure
    .input(getOrderTrackingInputSchema)
    .query(({ input }) => getOrderTracking(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Drug delivery TRPC server listening at port: ${port}`);
}

start();
