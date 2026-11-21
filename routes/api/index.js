const express = require('express');
const { authenticate, errors } = require('../../middleware/api');

const router = express.Router();
router.use(async (req, res, next) => {
    try { await require('../../models').RequestLog.create({ method: req.method, url: req.originalUrl }); }
    catch (error) { console.error('Журнал API:', error.message); }
    next();
});
router.use(express.json({ limit: '100kb' }));
for (const name of ['users','tweets','comments']) {
    const controller = require('../../controllers/api-' + name);
    router.get('/' + name, ...(name === 'users' ? [authenticate] : []), controller.list);
    router.get('/' + name + '/:id', ...(name === 'users' ? [authenticate] : []), controller.get);
    router.post('/' + name, ...(name === 'users' ? [] : [authenticate]), controller.create);
    router.put('/' + name + '/:id', authenticate, controller.update);
    router.patch('/' + name + '/:id', authenticate, controller.update);
    router.delete('/' + name + '/:id', authenticate, controller.remove);
}
router.use((req,res) => res.status(404).json({error:'Маршрут API не найден.'}));
router.use(errors);
module.exports = router;
