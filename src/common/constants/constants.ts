import { isProd } from "../utils/checkMode";

export const APPOINTMENT_FEE = Number(process.env.APPOINTMENT_FEE ?? 20.00);
export const APPOINTMENT_FEE_NPR = APPOINTMENT_FEE*120
export const MAX_USER_DAILY_APPOINTMENTS = Number(process.env.MAX_USER_DAILY_APPOINTMENTS) || 3;
export const MAX_DOCTOR_DAILY_APPOINTMENTS = Number(process.env.MAX_DOCTOR_DAILY_APPOINTMENTS) || 30;
export const PAYMENT_EXPIRY_MINUTES = isProd() ? Number(process.env.PAYMENT_EXPIRY_MINUTES) || 9 : 1; // in minutes
export const APPOINTMENT_EXPIRY_MINUTES = isProd() ? Number(process.env.APPOINTMENT_EXPIRY_MINUTES) || 10 : 5; // in minutes