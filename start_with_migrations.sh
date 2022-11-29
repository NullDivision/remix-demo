#!/bin/sh

set -ex
npx prisma migrate deploy
npx prisma db push
npm run start
