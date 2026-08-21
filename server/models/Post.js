import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
    {
        authorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        text: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const postSchema = new mongoose.Schema(
    {
        authorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        text: {
            type: String,
            required: true,
        },

        images: {
            type: [String],
            default: [],
        },

        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],

        comments: [commentSchema],

        audience: {
            type: {
                type: String,
                enum: [
                    "EVERYONE",
                    "DEPARTMENT",
                    "SPECIFIC",
                ],
                default: "EVERYONE",
            },

            departments: {
                type: [String],
                default: [],
            },

            employeeIds: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Employee",
                },
            ],
        },

        // ======================================
        // RESHARE
        // ======================================
        resharedFrom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const Post =
    mongoose.models.Post ||
    mongoose.model("Post", postSchema);

export default Post;