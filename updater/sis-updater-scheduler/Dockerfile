FROM registry.access.redhat.com/ubi9/nodejs-18-minimal

WORKDIR /opt/app-root/src

ENV NODE_ENV=production

ARG SENTRY_ENVIRONMENT
ENV SENTRY_ENVIRONMENT=$SENTRY_ENVIRONMENT

ARG SENTRY_RELEASE
ENV SENTRY_RELEASE=$SENTRY_RELEASE

COPY ./package* ./
RUN npm ci --omit-dev
COPY . .

EXPOSE 8082

CMD ["npm", "start"]
