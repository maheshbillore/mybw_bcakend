import Category from "../models/category.model.js";
import Categorytype from "../models/categorytype.model.js";
import Service from "../models/service.model.js";

export const toSlug = (text: any) => {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 ]/g, "")  // remove special chars
        .replace(/\s+/g, "-");       // spaces → dash
};

export const generateMetaTitle = (name: any) => `${name} Services | Best ${name} Near You`;
export const generateMetaDescription = (name: any) =>
    `Find the best ${name} services near you. Book trusted and professional ${name} experts easily.`;
export const generateMetaKeywords = (name: any) =>
    `${name}, best ${name}, ${name} service, ${name} near me, ${name} professionals`;

export const generateCategoryDescription = (category: any) => {
    return `Find top-rated ${category} services near you. Get professional, affordable, and verified ${category.toLowerCase()} experts for home and commercial needs. Trusted by thousands of customers.`;
}

export async function updateAllCategoriesSEO() {
    try {
        const categories = await Category.find();

        for (const cat of categories) {
            const slug = toSlug(cat.name);
            await Category.updateOne(
                { _id: cat._id },
                {
                    $set: {
                        slug,
                    },
                }
            );
        } 
    } catch (err) {
        console.error("Error updating categories:", err);
    }
}




export async function updateAllSubCategoriesSEO() {
    try {
        const categories = await Categorytype.find();
        for (const cat of categories) {
            const slug = toSlug(cat.name);
            const description = await generateCategoryDescription(cat.name);
            /* const metaTitle = generateMetaTitle(cat.name);
             const metaDescription = generateMetaDescription(cat.name);
             const metaKeywords = generateMetaKeywords(cat.name); */
            await Categorytype.updateOne(
                { _id: cat._id },
                {
                    $set: {
                        slug,
                        description,
                        /* metaTitle,
                         metaDescription,
                         metaKeywords, */
                    },
                }
            );
        }

       
    } catch (err) {
        console.error("Error updating categories:", err);
    }
}



export async function updateAllServicesSEO() {
    try {
        const categories = await Service.find();
        for (const cat of categories) {
            const slug = toSlug(cat.name);
            const metaTitle = generateMetaTitle(cat.name);
            const metaDescripton = generateMetaDescription(cat.name);
            const metaKeyword = generateMetaKeywords(cat.name);
            const description = await generateCategoryDescription(cat.name);
            await Service.updateOne(
                { _id: cat._id },
                {
                    $set: {
                        slug,
                        metaTitle,
                        metaDescripton,
                        metaKeyword,
                        description
                    },
                }
            );
        }
 
    } catch (err) {
        console.error("Error updating categories:", err);
    }
}



export const increaseCustomer = () => 5119;
export const increasePartner = () => 4521;
export const increaseServiceBooking = () => 575;
export const increaseServicePartnerAvl = () => 95;