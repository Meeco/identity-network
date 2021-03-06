import bodyParser from "body-parser";
import "dotenv/config";
import express, { Application } from "express";
import morgan from "morgan";
import "reflect-metadata";
import swaggerUi from "swagger-ui-express";
import { errorHandler, notFoundHandler } from "./middleware";
import { RegisterRoutes } from "./routes";

export const app: Application = express();

app.use(express.json());
app.use(morgan("tiny"));
app.use(express.static("public"));

app.get("/", (_req, res) => {
  res.redirect("/docs");
});

app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    swaggerOptions: {
      url: "/swagger.json",
    },
  })
);

RegisterRoutes(app);

// parse various different custom JSON types as JSON
app.use(bodyParser.json({ type: "application/*+json" }));

// global error handling
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());
app.use(errorHandler);
app.use(notFoundHandler);
