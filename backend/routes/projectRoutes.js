const express = require("express");
const mongoose = require("mongoose");
const Project = require("../models/project");

const router = express.Router();
// ==========================================
// GET ALL PROJECTS
// ==========================================
router.get("/", async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 });

        res.status(200).json(projects);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch projects",
            error: error.message
        });
    }
});

// ==========================================
// CREATE A NEW PROJECT
// ==========================================
router.post("/", async (req, res) => {
    try {
        const {
            clientName,
            projectTitle,
            currency,
            deadline,
            milestones
        } = req.body;

        // Basic validation
        if (
            !clientName ||
            !projectTitle ||
            !currency ||
            !deadline ||
            !milestones ||
            milestones.length === 0
        ) {
            return res.status(400).json({
                message: "All project fields and at least one milestone are required."
            });
        }

        // Calculate total milestone amount
        const totalAmount = milestones.reduce(
            (sum, milestone) => sum + Number(milestone.amount),
            0
        );

        // Validate milestone amounts
        if (totalAmount <= 0) {
            return res.status(400).json({
                message: "Total milestone amount must be greater than zero."
            });
        }

        // Create project
        const project = new Project({
            clientName,
            projectTitle,
            currency,
            deadline,
            milestones: milestones.map((milestone) => ({
                title: milestone.title,
                amount: Number(milestone.amount),
                isPaid: milestone.isPaid || false,
                paidDate: milestone.isPaid ? new Date() : null
            }))
        });

        const savedProject = await project.save();

        res.status(201).json({
            message: "Project created successfully",
            project: savedProject,
            totalAmount
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to create project",
            error: error.message
        });
    }
});

// ==========================================
// TOGGLE MILESTONE PAID / UNPAID
// ==========================================
router.patch("/:id/milestones/:milestoneId", async (req, res) => {
    try {
        const { id, milestoneId } = req.params;

        // Validate Project ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid project ID"
            });
        }

        const project = await Project.findById(id);

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        // Find milestone
        const milestone = project.milestones.id(milestoneId);

        if (!milestone) {
            return res.status(404).json({
                message: "Milestone not found"
            });
        }

        // Toggle payment status
        milestone.isPaid = !milestone.isPaid;

        // Set or clear paid date
        if (milestone.isPaid) {
            milestone.paidDate = new Date();
        } else {
            milestone.paidDate = null;
        }

        await project.save();

        res.status(200).json({
            message: milestone.isPaid
                ? "Milestone marked as paid"
                : "Milestone marked as unpaid",
            project
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to update milestone",
            error: error.message
        });
    }
});
// ==========================================
// UPDATE PROJECT
// ==========================================
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const {
            clientName,
            projectTitle,
            currency,
            deadline,
            milestones
        } = req.body;

        // Check project ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid project ID"
            });
        }

        // Validate required fields
        if (
            !clientName ||
            !projectTitle ||
            !currency ||
            !deadline ||
            !milestones ||
            milestones.length === 0
        ) {
            return res.status(400).json({
                message:
                    "All project fields and at least one milestone are required."
            });
        }

        // Validate milestones
        for (const milestone of milestones) {
            if (!milestone.title || !milestone.title.trim()) {
                return res.status(400).json({
                    message: "Every milestone must have a title."
                });
            }

            if (
                !milestone.amount ||
                Number(milestone.amount) <= 0
            ) {
                return res.status(400).json({
                    message:
                        "Every milestone must have an amount greater than zero."
                });
            }
        }

        // Find existing project
        const project = await Project.findById(id);

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        // IMPORTANT:
        // Keep the old milestones before replacing them
        const existingMilestones = project.milestones;

        // Update basic project information
        project.clientName = clientName.trim();
        project.projectTitle = projectTitle.trim();
        project.currency = currency;
        project.deadline = deadline;

        // Update milestones while preserving payment status
        project.milestones = milestones.map((milestone) => {

            const existingMilestone = milestone._id
                ? existingMilestones.id(milestone._id)
                : null;

            return {
                _id: existingMilestone
                    ? existingMilestone._id
                    : undefined,

                title: milestone.title.trim(),

                amount: Number(milestone.amount),

                // Keep existing Paid/Pending status
                isPaid: existingMilestone
                    ? existingMilestone.isPaid
                    : Boolean(milestone.isPaid),

                // Keep existing payment date
                paidDate: existingMilestone
                    ? existingMilestone.paidDate
                    : milestone.isPaid
                        ? new Date()
                        : null
            };
        });

        // Save updated project
        const updatedProject = await project.save();

        res.status(200).json({
            message: "Project updated successfully",
            project: updatedProject
        });

    } catch (error) {
        console.error("UPDATE PROJECT ERROR:", error);

        res.status(500).json({
            message: "Failed to update project",
            error: error.message
        });
    }
});
// ==========================================
// DELETE PROJECT
// ==========================================
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // Validate Project ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid project ID"
            });
        }

        const project = await Project.findById(id);

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        // Prevent deleting projects with paid milestones
        const hasPaidMilestone = project.milestones.some(
            (milestone) => milestone.isPaid
        );

        if (hasPaidMilestone) {
            return res.status(400).json({
                message: "Cannot delete a project that contains completed payments."
            });
        }

        await Project.findByIdAndDelete(id);

        res.status(200).json({
            message: "Project deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to delete project",
            error: error.message
        });
    }
});

module.exports = router;