const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Microblogging API',
            version: '1.0.0',
            description: 'API documentation for the microblogging platform.'
        },
        servers: [
            { url: 'http://localhost:3000' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                }
            }
        },
        security: [{ bearerAuth: [] }] 
    },
    apis: ['./routes/*.js'], 
};

module.exports = swaggerOptions;
