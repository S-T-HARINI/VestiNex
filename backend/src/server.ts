import app from './app';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`[VestiNex API] Server running on port ${PORT}`);
  console.log(`[VestiNex API] Health check at http://localhost:${PORT}/health`);
  console.log(`[VestiNex API] Pre-seeded with 4 users, 3 projects, deployments, and out-of-order incidents.`);
});
