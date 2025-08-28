import type { NextApiRequest, NextApiResponse } from "next";

type HealthResponse = {
  status: string;
  timestamp: string;
  version: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || "unknown",
  });
}
