module.exports = (app, ensureAuthenticated) => {

  // Authenticate on all admin routes
  // =============================================================
  app.use('/admin/*', ensureAuthenticated)
  
  // Authenticate on all api routes
  // =============================================================
  app.use('/api/*', (req, res, next) => {
    const { originalUrl } = req
    const safe_paths = ['/api/password']
      
    if (!req.isAuthenticated() && !safe_paths.includes(originalUrl) ) {
        return req.sendStatus(403)
    }
    
    next()
  })

}