const mongoose = require("mongoose");

// Milestone Schema
const milestoneSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },

    amount: {
        type: Number,
        required: true,
        min: 0
    },

    isPaid: {
        type: Boolean,
        default: false
    },

    paidDate: {
        type: Date,
        default: null
    }
});

// Project Schema
const projectSchema = new mongoose.Schema(
    {
        clientName: {
            type: String,
            required: true,
            trim: true
        },

        projectTitle: {
            type: String,
            required: true,
            trim: true
        },

        currency: {
            type: String,
            required: true,
            default: "USD"
        },

        deadline: {
            type: Date,
            required: true
        },

        milestones: {
            type: [milestoneSchema],
            required: true,
            validate: {
                validator: function (milestones) {
                    return milestones.length > 0;
                },
                message: "At least one milestone is required."
            }
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Project", projectSchema);