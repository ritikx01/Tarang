import jwt from "jsonwebtoken";
import logger from "../../utils/logger";

const secret = process.env.JWT_SECRET || "secret-key";

export function setUser(id: string) {
  const userToken = jwt.sign({ id: id }, secret, { expiresIn: "48h" });
  return userToken;
}

export function invalidUser() {
  const userToken = jwt.sign({ id: "None" }, secret, { expiresIn: "0h" });
  return userToken;
}
interface JWTPayload {
  id: string;
  iat?: number;
}

export function getUser(userToken: string) {
  try {
    const verifyToken = jwt.verify(userToken, secret) as JWTPayload;
    return verifyToken.id;
  } catch (error) {
    logger.error("JWT verification failed:", error);
    return undefined;
  }
}
