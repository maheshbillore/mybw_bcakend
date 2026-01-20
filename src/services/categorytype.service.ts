import Categorytype from "../models/categorytype.model.js";
import { IAddCategoryType } from "../shared/interface.js";
import { GenericResponse } from "../shared/type.js";
import { toSlug } from "../utils/seo_helper.js";

export class CategorytypeService {

    static async create(data: IAddCategoryType, files: any): Promise<GenericResponse<any>> {
        try {
            const { name, category } = data;
            if (!name) {
                return {
                    success: false,
                    data: null,
                    message: "Category Type Name is Required"
                }
            }


            const checkExit = await Categorytype.findOne({ name: name, category: category });
            if (checkExit) {
                return {
                    success: false,
                    data: null,
                    message: "This category type name already exists"
                }
            }
            let slug = await toSlug(data.name);
            const result = await Categorytype.create({ name: name, slug, image: files.filename, category: category });

            return {
                success: true,
                data: result,
                message: "Category Type Created Successfully !"
            }

        } catch (error: any) {
            return {
                success: false,
                data: data,
                message: error?.message ? error?.message : "Error when creating category type"
            }
        }

    }

    static async index(currentPage: number, pageSize: number): Promise<GenericResponse<any>> {
        try {
            const skip = (currentPage - 1) * pageSize;
            let [categoryType1, totalItems] = await Promise.all([
                await Categorytype.find()
                    // .skip(skip)
                    // .limit(pageSize)
                    .sort({ _id: -1 }).populate("category", "name"),
                Categorytype.countDocuments(),
            ]);


            const categoryType = categoryType1.map((category) => {
                let fullUrl = null;
                if (category?.image) {
                    fullUrl = `${process.env.BASE_URL}/uploads/categoryType/${category.image}`;
                }
                return {
                    ...category.toObject(), // convert Mongoose doc to plain JS object
                    image: fullUrl,
                };
            });


            const totalPages = Math.ceil(totalItems / pageSize);

            return {
                success: true,
                data: {
                    categoryType,
                    pagination: {
                        currentPage,
                        pageSize,
                        totalItems,
                        totalPages,
                    },
                },
                message: "Partners data fetched successfully",
            };

        } catch (error) {
            return {
                success: false,
                data: null,
                message: "Something went wrong"
            }
        }

    }

    static async update(id: string, data: IAddCategoryType, file: any): Promise<GenericResponse<any>> {

        try {
            const { name, category } = data;
            if (!name) {
                return {
                    success: false,
                    data: null,
                    message: "Category Type Name are Required !"
                }
            }

            const checkExist = await Categorytype.findOne({
                name: data?.name, category,
                _id: { $ne: Object(id) },
            });

            if (checkExist) {
                return {
                    success: false,
                    data: null,
                    message: "This category type is alreday exit"
                }
            }

            let findOldImage = await Categorytype.findOne({ _id: id });
            let categoryTypeImage = file?.filename ? file?.filename : findOldImage?.image;


            let slug = await toSlug(data?.name);
            const update = await Categorytype.findByIdAndUpdate(
                { _id: id },
                { name: data?.name, category, image: categoryTypeImage, slug },
                { new: true }
            )
            return {
                success: true,
                data: update,
                message: "Category Type is update successfully"
            }
        } catch (error: any) {
            return {
                success: true,
                data: null,
                message: error?.message ? error?.message : "Error when updating category type"
            }
        }

    }

    static async delete(id: any): Promise<GenericResponse<any>> {
        try {
            const categoryType = await Categorytype.findOne({ _id: id });
            const result = await Categorytype.deleteOne({ _id: id })
            if (!categoryType) {
                return {
                    success: false,
                    data: null,
                    message: "Category Type is not found"
                }
            }
            return {
                success: true,
                data: null,
                message: "Category Type is deleted successfully"
            }
        } catch (error) {
            return {
                success: true,
                data: null,
                message: "Category Type is deleted successfully1"
            }
        }

    }


}