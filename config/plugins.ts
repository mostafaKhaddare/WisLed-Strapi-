export default ({ env }) => ({
  upload: {
    config: {
      provider: "local",
      breakpoints: true,
    },
  },
  // ADD THIS SECTION BELOW:
  "users-permissions": {
    config: {
      jwtSecret: env("JWT_SECRET"),
    },
  },
});