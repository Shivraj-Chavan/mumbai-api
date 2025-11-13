import helmet from "helmet";
import cors from "cors";
// import xss from "xss-clean";
import hpp from "hpp";
// import expressMongoSanitize from "express-mongo-sanitize";
import rateLimiter from './ratelimit.js'
import { config } from "./env.js";

export const securityMiddlewares = (app) => {
  app.use(rateLimiter)
  app.use(helmet());    
//   app.use(xss());   
  app.use(hpp());   
//   app.use(expressMongoSanitize());  
  // app.use(
  //   cors({
  //     origin: config.ALLOWED_ORIGINS.split(","),    
  //     credentials: true,
  //   })
  // );
  app.use(
    cors({
      origin: '*', // Allows all origins
      credentials: false, // Should be false if you're using '*' as origin
    })
  );
};
