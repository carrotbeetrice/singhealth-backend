module.exports = (app) => {
    app.use('/', require('./root'));
    app.use('/users', require('./userRoutes'));
    app.use('/directory', require('./directoryRoutes'));
    app.use('/auth', require('./authRoutes'));
    app.use('/report', require('./reportRoutes'));
    app.use('/dashboard', require('./dashboardRoutes'));
    app.use('/actions', require('./tenantActionRoutes'));
}