import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { request } from "http";
import { max } from "lodash";

export interface IUser extends mongoose.Document {
    name?: string;
    email?: string;
    password?: string;
    fcm_token: string;
    role?: "customer" | "partner" | "admin" | "volunteer";
    phone?: string;
    joinVia?: "Phone" | "Google" | "Facebook";
    picture?: string;
    roleId?: string;
    isActive: boolean;
    dob?:string;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: false,
    },
    role: {
        type: String,
        enum: ["customer", "partner", "admin", "volunteer"],
        required: true,
    },
    uid: {
        type: String,
        required: false,
        default: null
    },
    joinVia: {
        type: String,
        enum: ["Phone", "Google", "Facebook"],
        default: "Phone",
        required: false
    },
    email: {
        type: String,
        required: false,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            "Please enter a valid email address",
        ],
    },
    phone: {
        type: String,
        required: false,
        default: null,
        max: 13,
    },
    fcm_token: {
        type: String,
        required: false,
        default: null,
    },
    password: {
        type: String,
        required: false,
    },
    picture: {
        type: String,
    },
    dob: {
        type: String,
    },
    roleId: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true
});



UserSchema.pre("save", async function (next) {
    if (!this.isModified("password") || !this.password) return next();

    // Only validate length if password is being set (not already hashed)
    if (this.password.length < 6 || this.password.length > 40) {
        return next(new Error("Password must be between 6 and 40 characters"));
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(this.password, salt);
        this.password = hashedPassword;
        next();
    } catch (error) {
        // console.error("Error hashing password:", error);
        next(error as Error);
    }
});

UserSchema.methods.comparePassword = async function (
    candidatePassword: string
): Promise<boolean> {
    try {
        if (!this.password) {
            return false;
        }
        const isMatch = await bcrypt.compare(candidatePassword, this.password);
        return isMatch;
    } catch (error) {
        // console.error("Error comparing passwords:", error);
        return false;
    }
};


mongoose.connection.once('open', async () => {
    try {
        const collection = mongoose.connection.collection('users'); // collection names are usually lowercase & plural
        const indexes = await collection.indexes();
        await collection.dropIndex('phone_1'); // most likely name 
        await collection.dropIndex('email_1'); // most likely name 
    } catch (err: any) {
        //   console.error('Error dropping index:', err.message);
    }
});

const User = mongoose.model<IUser>("User", UserSchema);

export default User;  
