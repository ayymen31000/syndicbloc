// src/controllers/apartmentsController.js - Apartment Management (Points 2, 5, 16)
const prisma = require('../config/prisma');
const { sanitizeString } = require('../utils/security');

async function getAllApartments(req, res, next) {
  try {
    const apartments = await prisma.appartement.findMany({
      orderBy: { numero: 'asc' },
    });

    return res.status(200).json({
      status: 'success',
      data: { apartments },
    });
  } catch (err) {
    next(err);
  }
}

async function updateApartment(req, res, next) {
  try {
    const { id } = req.params;
    const { nom_resident, telephone, notes } = req.body;

    const existing = await prisma.appartement.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        code: 'APARTMENT_NOT_FOUND',
        message: 'Appartement non trouvé.',
      });
    }

    const updated = await prisma.appartement.update({
      where: { id },
      data: {
        nom_resident: nom_resident ? sanitizeString(nom_resident.trim()) : existing.nom_resident,
        telephone: telephone !== undefined ? sanitizeString(telephone ? telephone.trim() : null) : existing.telephone,
        notes: notes !== undefined ? sanitizeString(notes ? notes.trim() : null) : existing.notes,
      },
    });

    await prisma.auditLog.create({
      data: {
        admin_id: req.user.id,
        action: 'APARTMENT_UPDATED',
        details: `Appartement ${existing.numero} mis à jour (${updated.nom_resident})`,
        ip_address: req.ip,
      },
    });

    return res.status(200).json({
      status: 'success',
      data: { apartment: updated },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllApartments,
  updateApartment,
};
