import { execFileSync } from 'node:child_process';

export default function setup() {
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'pipe',
    env: process.env,
  });
}
