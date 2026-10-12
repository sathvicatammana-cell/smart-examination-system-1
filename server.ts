import { app } from './backend/src/app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Hallpass Examination Management Backend Started`);
  console.log(` Server Port: http://localhost:${PORT}`);
  console.log(` Health Check: http://localhost:${PORT}/api/health`);
  console.log(` Firebase Status: http://localhost:${PORT}/api/health/firebase`);
  console.log(`=======================================================`);
});
