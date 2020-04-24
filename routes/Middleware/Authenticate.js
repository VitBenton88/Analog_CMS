module.exports = (app, ensureAuthenticated) => {

  // Authenticate on all admin routes
  // =============================================================
  app.use('/admin/*', ensureAuthenticated)

}