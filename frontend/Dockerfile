FROM node:12.22.0-alpine as builder

WORKDIR /app

COPY package.json yarn.lock .

RUN yarn install

COPY .  .

ARG NAMESPACE=develop
ARG OVERLAY=develop

RUN yarn build

FROM nginx:1.14
WORKDIR /app
COPY --from=builder /app/build .
ADD nginx /etc/nginx
