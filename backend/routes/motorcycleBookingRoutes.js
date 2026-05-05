import express from 'express'
import authMiddleware from '../middlewares/auth.js'
import { 
  acquireCheckoutLock,
  createWalkInMotorcycleBooking,
  createMotorcycleBooking, 
  deleteMotorcycleBooking, 
  deleteMotorcycleBookingLocationLog,
  getMotorcycleBookings, 
  getMyMotorcycleBookings, 
  releaseCheckoutLock,
  updateMotorcycleBooking, 
  updateMotorcycleBookingStatus, 
  restoreMotorcycleBooking,
  permanentDeleteMotorcycleBooking,
  confirmFullPayment, 
  requestBookingProofReupload,
  reuploadBookingPaymentProof,
  downloadRentalAgreement,
} from '../controllers/motorcycleBookingController.js'
import { uploads } from '../middlewares/uploads.js';

const motorcycleBookingRouter = express.Router();

motorcycleBookingRouter.post('/checkout-lock/acquire', authMiddleware, acquireCheckoutLock);
motorcycleBookingRouter.post('/checkout-lock/release', authMiddleware, releaseCheckoutLock);
motorcycleBookingRouter.post('/', authMiddleware, uploads.single('paymentProofImage'), createMotorcycleBooking);
motorcycleBookingRouter.post('/walk-in', createWalkInMotorcycleBooking);
motorcycleBookingRouter.get('/', getMotorcycleBookings);
motorcycleBookingRouter.get('/mybooking', authMiddleware, getMyMotorcycleBookings);
motorcycleBookingRouter.get('/:bookingId/rental-agreement', downloadRentalAgreement);
motorcycleBookingRouter.put('/:id', uploads.single('motorcycleImage'), updateMotorcycleBooking); 
motorcycleBookingRouter.patch('/:id/status', updateMotorcycleBookingStatus); 
motorcycleBookingRouter.patch('/:id/confirm-payment', confirmFullPayment);
motorcycleBookingRouter.patch('/:id/request-reupload', requestBookingProofReupload);
motorcycleBookingRouter.patch('/:id/reupload-proof', authMiddleware, uploads.single('paymentProofImage'), reuploadBookingPaymentProof);
motorcycleBookingRouter.delete('/:id', deleteMotorcycleBooking); 
motorcycleBookingRouter.delete('/:id/location-log', deleteMotorcycleBookingLocationLog);
motorcycleBookingRouter.patch('/:id/restore', restoreMotorcycleBooking);
motorcycleBookingRouter.delete('/:id/permanent', permanentDeleteMotorcycleBooking);

export default motorcycleBookingRouter;