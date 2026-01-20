import dotenv from "dotenv";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import Customer from "../models/customer.model.js";
import Partner from "../models/partner.model.js";
import Roles from "../models/roles.model.js";
import mongoose from "mongoose";
import { GenericResponse } from "../shared/type.js";
import Category from "../models/category.model.js";
import SubCategory from "../models/sub.category.model.js";
import { fileNameBindWithObject, generateReferralCode, getProfile, removeCountryCode, updateProfileCompletion } from "../utils/helper.js";
import Service from "../models/service.model.js";
import _ from "lodash";
import RoleHasPermissions from "../models/role.has.permissions.model.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
}

class AuthService {
    async registerAdmin(name: string, email: string, password: string) {
        try {
            const userExists = await User.findOne({ email });
            if (userExists) {
                return {
                    success: false,
                    data: null,
                    message: "User already registered with this email",
                };
            }
            if (!name || !email || !password) {
                return {
                    success: false,
                    data: null,
                    message: "All fields are required...",
                };
            }

            const role = await Roles.findOne({ name: 'admin' }).select('_id name');

            const user = await User.create({
                name,
                email,
                password,
                role: role?.name,
                roleId: role?._id,
                isActive: true,
            });

            const userId = user._id;
            const token = jwt.sign({ id: userId, role: role?.name }, JWT_SECRET, {
                expiresIn: "7d",
            });
            return {
                success: true,
                data: {
                    token,
                    user: {
                        id: userId,
                        name,
                        email,
                        role: role?.name,
                    },
                },
                message: "Admin registered successfully",
            };
        } catch (error: any) {
            console.error("Error during admin registration:", error);
            return {
                success: false,
                data: null,
                message: error?.message || "Error during admin registration",
            };
        }
    }

    async register(
        name: string,
        email: string,
        password: string,
        phone: string,
        picture: string,
        dob: Date,
        roleId: string,
        extraData: any = {}
    ) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const userExists = await User.findOne({ email }).session(session);

            if (userExists) {
                return {
                    success: false,
                    data: null,
                    message: "User already registered with this email",
                };
            }

            if (new Date(dob).getTime() > Date.now()) {
                session.abortTransaction();
                session.endSession();
                return {
                    success: false,
                    data: null,
                    message: "Date of birth cannot be in the future",
                };
            }

            if (new Date(dob).getTime() < new Date("1960-01-01").getTime()) {
                session.abortTransaction();
                session.endSession();
                return {
                    success: false,
                    data: null,
                    message: "Date of birth cannot be before 1960",
                };
            }

            const age = new Date().getFullYear() - new Date(dob).getFullYear();
            if (age < 18) {
                session.abortTransaction();
                session.endSession();
                return {
                    success: false,
                    data: null,
                    message: "User must be at least 18 years old",
                };
            }

            if (!name || !email || !password || !phone || !picture || !dob || !roleId) {
                session.abortTransaction();
                session.endSession();
                return {
                    success: false,
                    data: null,
                    message: "All fields are required...",
                };
            }

            const getRoleName = await Roles.findById(roleId).select('name');

            const user = await User.create(
                [
                    {
                        name,
                        email,
                        password,
                        phone,
                        picture,
                        role: getRoleName?.name,
                        roleId,
                        isActive: true,
                    },
                ],
                { session }
            );

            const userId = user[0]._id;
            const userRole = user[0].role;

            const customer = await Customer.create(
                [
                    {
                        user: userId,
                        dob: new Date(dob),
                        address: extraData.address ?? null,
                        latitude: extraData.latitude ?? null,
                        longitude: extraData.longitude ?? null,
                        city: extraData.city ?? null,
                        state: extraData.state ?? null,
                        country: extraData.country ?? null,
                        pincode: extraData.pincode ?? null,
                        profile: extraData.profile ?? null,
                        bookingHistory: [],
                        paymentHistory: [],
                        complaints: [],
                    },
                ],
                { session }
            );

            await session.commitTransaction();
            session.endSession();

            const token = jwt.sign(
                { id: userId, role: userRole, customer },
                process.env.JWT_SECRET!,
                { expiresIn: "7d" }
            );

            return {
                success: true,
                data: {
                    token,
                    user: {
                        id: userId,
                        name,
                        email,
                        phone,
                        role: userRole,
                        picture,
                        roleId
                    },
                },
                message: "User registered successfully",
            };
        } catch (error: any) {
            await session.abortTransaction();
            session.endSession();
            return {
                success: false,
                data: null,
                message: error?.message || "Error during registration",
            };
        }
    }

    async login(email: string, password: string) {
        try {
            const user = await User.findOne({ email });

            if (!user) {
                return {
                    success: false,
                    data: null,
                    message: "User not found",
                };
            }

            if (!user.isActive) {
                return {
                    success: false,
                    data: null,
                    message: "Account is deactivated. Please contact admin.",
                };
            }

            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                return {
                    success: false,
                    data: null,
                    message: "Invalid credential",
                };
            }

            const token = jwt.sign(
                { 
                    id: user._id, role: user.role 
                },
                JWT_SECRET,
                {
                    expiresIn: "7d",
                }
            );

            let populatedBooking = null;
            if (user.role === "customer") {
                populatedBooking = await Customer.findOne({
                    user: user._id,
                });

                if (!populatedBooking) {
                    throw Error("customer not found with this user id");
                }
            } else if (user.role === "partner") {
                populatedBooking = await Partner.findOne({ user: user._id });

                if (!populatedBooking) {
                    throw Error("Partner not found with this user id");
                }
            }

            const userPermissions = await RoleHasPermissions.findOne({ roleId : user.roleId })
                .populate("permissionId", "name permissionId url icon order")
                .select('-createdAt -updatedAt -__v')
                .lean()
                .then(doc => {
                    if (!doc) return null;
                    return {
                        ...doc,
                        permissions: doc.permissionId,
                        permissionId: undefined
                    };
                });

            return {
                success: true,
                data: {
                    token,
                    user: {
                        id: user._id,
                        name: user.name,
                        role: user.role,
                        roleId: populatedBooking?._id,
                        userPermissions
                    }
                },
                message: "User successfully login",
            };
        } catch (error) {
            console.error("Error during login:", error);
            throw new Error("Error during login: " + (error as Error).message);
        }
    }

    async resetPassword(email: string, newPassword: string) {
        try {
            const user = await User.findOne({ email });
            if (!user) {
                return {
                    success: false,
                    message: "User not found",
                };
            }

            user.password = newPassword;
            await user.save();

            return {
                success: true,
                message: "Password reset successfully",
            };
        } catch (error) {
            console.error("Error resetting password:", error);
            throw new Error("Error during password reset");
        }
    }

    async registerPartner(
        name: string,
        email: string,
        password: string,
        phone: string,
        picture: string = "",
        dob: Date,
        extraData: any = {},
        files: { [fieldname: string]: Express.Multer.File[] }
    ): Promise<GenericResponse<any>> {
        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            const userExists = await User.findOne({ email }).session(session);

            if (userExists) {
                session.abortTransaction();
                return {
                    success: false,
                    data: null,
                    message: "User already registered with this email",
                };
            }

            const userPhoneExists = await User.findOne({ phone }).session(session);

            if (userPhoneExists) {
                session.abortTransaction();
                return {
                    success: false,
                    data: null,
                    message: "User already registered with this Phone",
                };
            }


            if (new Date(dob).getTime() > Date.now()) {
                session.abortTransaction();
                session.endSession();
                return {
                    success: false,
                    data: null,
                    message: "Date of birth cannot be in the future",
                };
            }

            if (new Date(dob).getTime() < new Date("1960-01-01").getTime()) {
                session.abortTransaction();
                session.endSession();
                return {
                    success: false,
                    data: null,
                    message: "Date of birth cannot be before 1960",
                };
            }

            const age = new Date().getFullYear() - new Date(dob).getFullYear();
            if (age < 18) {
                session.abortTransaction();
                session.endSession();
                return {
                    success: false,
                    data: null,
                    message: "User must be at least 18 years old",
                };
            }

            if (!name || !email || !password || !phone) {
                session.abortTransaction();
                return {
                    success: false,
                    data: null,
                    message: "All field are required...",
                };
            }


            if (!extraData?.skills) {
                return {
                    success: false,
                    data: null,
                    message: "skills are required",
                };
            }


            let PSkills = [];
            if (!Array.isArray(extraData.skills)) {
                PSkills.push(extraData.skills);
            } else {
                PSkills = extraData.skills;
            }




            const skills = PSkills.map((id: any) => new mongoose.Types.ObjectId(id));

            const subcategoriesByCategory = await Service.find({
                _id: { $in: skills },
            }).select("category categorytype name");



            let categories = subcategoriesByCategory.map((subcategory: any) => subcategory.category.toString());
            categories = [...new Set(categories)];
            let subcategories = subcategoriesByCategory.map((subcategory: any) => subcategory._id.toString());
            subcategories = [...new Set(subcategories)];
            let typeOfCategory = subcategoriesByCategory.map((subcategory: any) => subcategory.categorytype.toString());
            typeOfCategory = [...new Set(typeOfCategory)];

            let subcategoriesNames = subcategoriesByCategory.map((subcategory: any) => subcategory);
            // subcategoriesNames = [...new Set(subcategoriesNames)];


            const yearOfExprence = extraData.yearOfExprence || [];

            interface SkillExperience {
                serviceId: string;
                skill: string;
                yearOfExprence: number;
                experienceCertificates: string;
            }

            const skillsWithYearOfExprence: SkillExperience[] = [];


            subcategoriesNames.forEach((item: any) => {
                const serviceId = item?._id?.toString?.();

                const experienceYear = yearOfExprence?.[serviceId] ?? 0;

                let experienceCertificate = files?.experienceCertificates?.[serviceId]?.filename ?? "";

                // Optional: If `files` is an array (like from multer), process it accordingly
                if (Array.isArray(files)) {
                    files.forEach((file: any) => {
                        if (file?.fieldname?.includes(serviceId)) {
                            experienceCertificate = file.filename;
                        }
                    });
                }

                skillsWithYearOfExprence.push({
                    serviceId: item?._id?.toString(),
                    skill: item?.name,
                    yearOfExprence: experienceYear,
                    experienceCertificates: experienceCertificate,
                });
            });

            extraData = await fileNameBindWithObject(files, extraData);


            // if (files.aadharFront?.[0]) {
            //     extraData.aadharFront = files.aadharFront[0].filename;
            // }
            // if (files.aadharBack?.[0]) {
            //     extraData.aadharBack = files.aadharBack[0].filename;
            // }
            // if (files.panFront?.[0]) {
            //     extraData.panFront = files.panFront[0].filename;
            // }
            // if (files.panBack?.[0]) {
            //     extraData.panBack = files.panBack[0].filename;
            // }

            // if (files.picture?.[0]) {
            //     picture = files.picture[0].filename;
            // } 

            if (
                files.experienceCertificates &&
                files.experienceCertificates.length > 0
            ) {
                extraData.experienceCertificates =
                    files.experienceCertificates.map((file) => file.filename);
            }




            const user = await User.create(
                [
                    {
                        name,
                        email,
                        password,
                        phone,
                        role: "partner",
                        isActive: false,
                    },
                ],
                { session }
            );
            const userId = user[0]._id;

            let totalExperience = 0;
            if (Array.isArray(extraData.yearOfExprence)) {
                totalExperience = Math.max(...extraData.yearOfExprence);
            }

            const partner = await Partner.create([{
                user: userId,
                dob: dob,
                profile: extraData?.picture,
                category: categories.map((category: any) => new mongoose.Types.ObjectId(category.toString())) || [],
                subCategory: subcategories.map((subcategory: any) => new mongoose.Types.ObjectId(subcategory.toString())) || [],
                services: skills.map((skill: any) => new mongoose.Types.ObjectId(skill.toString())) || [],
                skills: skillsWithYearOfExprence as any || [],
                categoryType: typeOfCategory || [],
                profileCompletion: 0,
                profilePendingScreens: 0,
                serviceAreaDistance: extraData.serviceAreaDistance ?? null,
                aadharNo: extraData.aadharNo ?? null,
                panNo: extraData.panNo ?? null,
                address: extraData.address ?? null,
                latitude: extraData.latitude ?? null,
                longitude: extraData.longitude ?? null,
                totalExperience: totalExperience ?? 0,
                city: extraData.city ?? null,
                state: extraData.state ?? null,
                country: extraData.country ?? null,
                pincode: extraData.pincode ?? null,
                aadharFront: extraData.aadharFront ?? null,
                aadharBack: extraData.aadharBack ?? null,
                panFront: extraData.panFront ?? null,
                panBack: extraData.panBack ?? null,
                experience: extraData.experience ?? 0,
                experienceCertificates:
                    files.experienceCertificates?.map(
                        (file) => file.filename
                    ) ?? [],

            }]
                ,
                { session }
            );

            await session.commitTransaction();
            session.endSession();

            if (partner[0]?.profile) {
                partner[0].profile = `${process.env.BASE_URL}/uploads/profile/${partner[0]?.profile}`;
            }

            let partnerUpdate = await Partner.findOne({ _id: partner[0]._id });
            if (partnerUpdate) {
                partnerUpdate.profileCompletion = await updateProfileCompletion(partnerUpdate._id.toString());
                // partnerUpdate.referralCode = await generateReferralCode(partnerUpdate._id.toString()); 
                await partnerUpdate.save();
            }



            if (user[0]?.phone && (partnerUpdate?.referralCode == null || partnerUpdate?.referralCode == "")) {
                let updatePartner = await Partner.findOneAndUpdate(
                    { user: user[0]._id },
                    {
                        referralCode: await removeCountryCode(user[0]?.phone),
                    },
                    { new: true }
                );
            }

            const token = jwt.sign(
                { id: userId, role: "partner" },
                process.env.JWT_SECRET!,
                { expiresIn: "7d" }
            );



            const profile = await getProfile(user[0]?._id?.toString() ?? "");



            return {
                success: true,
                data: {
                    token,
                    user: profile?.user,
                    partner: profile?.partner
                },
                message: "User registered successfully",
            };
        } catch (error: any) {
            console.error("error during partner registration", error);
            return {
                success: false,
                data: null,
                message: error?.response?.data?.message || error?.message,
            };
        }
    }
}

export default new AuthService();
