import Joi from "joi";

export const jobValidationSchema = Joi.object({
  title: Joi.string().min(3).required(),
  price: Joi.number().min(0).required(),
  full_address: Joi.string().min(3).required(),
  serviceId: Joi.string().required(),
  description: Joi.string().required(),
  job_date: Joi.string().required(),
  job_time: Joi.string().required(),
  estimated_time: Joi.string().required(),
  latitude: Joi.string().required(),
  longitude: Joi.string().required(),
  couponCode: Joi.string().empty(""),
  isEmergencyService:Joi.boolean().default(false),
  isVocationalBannerService:Joi.boolean().default(false),
  vocationalBannerServiceId:Joi.string().default(false),
});
