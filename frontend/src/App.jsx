import { useEffect, useState } from "react";
import "./App.css";
// ==========================================
// CURRENCY FORMATTER
// ==========================================

const formatCurrency = (currency, amount) => {
  const symbols = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£"
  };

  const symbol = symbols[currency] || currency;

  return `${symbol}${Number(amount || 0).toLocaleString()}`;
};
function App() {
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedProject, setSelectedProject] = useState(null);

  // Delete Project confirmation modal
  const [deleteProjectTarget, setDeleteProjectTarget] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add Project modal
  const [showForm, setShowForm] = useState(false);

  // Edit Project
  const [editingProjectId, setEditingProjectId] = useState(null);

  // Form data
  const [clientName, setClientName] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [deadline, setDeadline] = useState("");

  const [milestones, setMilestones] = useState([
    {
      title: "",
      amount: "",
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // ==========================================
  // FETCH PROJECTS
  // ==========================================
  const fetchProjects = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:5000/api/projects"
      );

      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }

      const data = await response.json();

      setProjects(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // ==========================================
  // TOGGLE MILESTONE PAID / PENDING
  // ==========================================
  const toggleMilestone = async (projectId, milestoneId) => {
    try {
      setError("");

      const response = await fetch(
        `http://localhost:5000/api/projects/${projectId}/milestones/${milestoneId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update milestone"
        );
      }

      // Fetch the latest projects immediately
      // so Paid/Pending and dashboard totals update without Refresh
      await fetchProjects();

    } catch (err) {
      console.error(err);
      setError(
        err.message || "Unable to update payment status."
      );
    }
  };

  // ==========================================
  // DELETE PROJECT
  // ==========================================

  // Open the in-app confirmation modal.
  const deleteProject = (project) => {
    setDeleteProjectTarget(project);
  };

  // Perform the actual deletion after the user confirms.
  const confirmDeleteProject = async () => {
    if (!deleteProjectTarget) {
      return;
    }

    const projectId = deleteProjectTarget._id;

    try {
      setError("");

      const response = await fetch(
        `http://localhost:5000/api/projects/${projectId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Keep the existing backend protection, including projects
        // that contain completed payments.
        setError(data.message || "Failed to delete project");
        setDeleteProjectTarget(null);
        return;
      }

      setDeleteProjectTarget(null);

      // Fetch the latest projects after deletion
      await fetchProjects();

      alert("Project deleted successfully");

    } catch (error) {
      console.error(error);
      setDeleteProjectTarget(null);
      alert("Unable to connect to the backend.");
    }
  };

  const cancelDeleteProject = () => {
    setDeleteProjectTarget(null);
  };

  // ==========================================
  // OPEN EDIT PROJECT FORM
  // ==========================================
  const openEditForm = (project) => {
    setFormError("");

    // Store the project ID
    setEditingProjectId(project._id);

    // Load existing project information
    setClientName(project.clientName);
    setProjectTitle(project.projectTitle);
    setCurrency(project.currency);
    setDeadline(
      new Date(project.deadline)
        .toISOString()
        .split("T")[0]
    );

    // Load existing milestones
    setMilestones(
      (project.milestones || []).map((milestone) => ({
        _id: milestone._id,
        title: milestone.title,
        amount: milestone.amount,
        isPaid: milestone.isPaid,
        paidDate: milestone.paidDate
      }))
    );

    // Open form
    setShowForm(true);
  };

  // ==========================================
  // OPEN ADD PROJECT FORM
  // ==========================================
  const openForm = () => {
    setFormError("");

    setEditingProjectId(null);

    setClientName("");
    setProjectTitle("");
    setCurrency("INR");
    setDeadline("");

    setMilestones([
      {
        title: "",
        amount: "",
      },
    ]);

    setShowForm(true);
  };

  // ==========================================
  // CLOSE ADD PROJECT FORM
  // ==========================================
  const closeForm = () => {
    if (!saving) {
      setShowForm(false);
      setFormError("");
    }
  };

  // ==========================================
  // ADD MILESTONE
  // ==========================================
  const addMilestone = () => {
    setMilestones([
      ...milestones,
      {
        title: "",
        amount: "",
      },
    ]);
  };

  // ==========================================
  // REMOVE MILESTONE
  // ==========================================
  const removeMilestone = (index) => {
    if (milestones.length === 1) {
      return;
    }

    setMilestones(
      milestones.filter(
        (_, milestoneIndex) => milestoneIndex !== index
      )
    );
  };

  // ==========================================
  // UPDATE MILESTONE
  // ==========================================
  const updateMilestone = (index, field, value) => {
    const updatedMilestones = [...milestones];

    updatedMilestones[index][field] = value;

    setMilestones(updatedMilestones);
  };

  // ==========================================
  // CREATE / UPDATE PROJECT
  // ==========================================
  const handleCreateProject = async (event) => {
    event.preventDefault();

    setFormError("");

    // Basic validation
    if (!clientName.trim()) {
      setFormError("Please enter the client name.");
      return;
    }

    if (!projectTitle.trim()) {
      setFormError("Please enter the project title.");
      return;
    }

    if (!currency) {
      setFormError("Please select a currency.");
      return;
    }

    if (!deadline) {
      setFormError("Please select a deadline.");
      return;
    }

    if (milestones.length === 0) {
      setFormError("Please add at least one milestone.");
      return;
    }

    for (const milestone of milestones) {
      if (!milestone.title.trim()) {
        setFormError(
          "Please enter a title for every milestone."
        );
        return;
      }

      if (
        !milestone.amount ||
        Number(milestone.amount) <= 0
      ) {
        setFormError(
          "Every milestone must have an amount greater than zero."
        );
        return;
      }
    }

    try {
      setSaving(true);

      // Check whether we are editing or creating
      const isEditing = Boolean(editingProjectId);

      const url = isEditing
        ? `http://localhost:5000/api/projects/${editingProjectId}`
        : "http://localhost:5000/api/projects";

      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientName: clientName.trim(),
          projectTitle: projectTitle.trim(),
          currency,
          deadline,

          milestones: milestones.map((milestone) => ({
            _id: milestone._id,
            title: milestone.title.trim(),
            amount: Number(milestone.amount),
            isPaid: milestone.isPaid || false,
            paidDate: milestone.paidDate || null,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            (isEditing
              ? "Failed to update project."
              : "Failed to create project.")
        );
      }

      // Close form
      setShowForm(false);

      // Refresh project list
      await fetchProjects();

      // Clear form
      setClientName("");
      setProjectTitle("");
      setCurrency("INR");
      setDeadline("");

      setMilestones([
        {
          title: "",
          amount: "",
        },
      ]);

      // Reset editing mode
      setEditingProjectId(null);

      // Success message
      alert(
        isEditing
          ? "Project updated successfully!"
          : "Project added successfully!"
      );

    } catch (err) {
      console.error(err);

      setFormError(
        err.message ||
          (editingProjectId
            ? "Failed to update project."
            : "Failed to create project.")
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // DASHBOARD CALCULATIONS
  // ==========================================

  const totalProjects = projects.length;

  // Keep totals separate because INR, USD, EUR and GBP
  // must never be added together.
  const currencyTotals = {
    INR: { total: 0, paid: 0, pending: 0 },
    USD: { total: 0, paid: 0, pending: 0 },
    EUR: { total: 0, paid: 0, pending: 0 },
    GBP: { total: 0, paid: 0, pending: 0 }
  };

  projects.forEach((project) => {
    const projectCurrency = project.currency || "INR";

    if (!currencyTotals[projectCurrency]) {
      currencyTotals[projectCurrency] = {
        total: 0,
        paid: 0,
        pending: 0
      };
    }

    const projectTotal = (project.milestones || []).reduce(
      (sum, milestone) =>
        sum + Number(milestone.amount || 0),
      0
    );

    const projectPaid = (project.milestones || [])
      .filter((milestone) => milestone.isPaid)
      .reduce(
        (sum, milestone) =>
          sum + Number(milestone.amount || 0),
        0
      );

    currencyTotals[projectCurrency].total += projectTotal;
    currencyTotals[projectCurrency].paid += projectPaid;
    currencyTotals[projectCurrency].pending +=
      projectTotal - projectPaid;
  });

  const activeCurrencies = Object.keys(currencyTotals).filter(
    (currencyCode) =>
      currencyTotals[currencyCode].total > 0
  );

  // Payment progress is shown separately for each currency.
  // This avoids incorrectly combining different currencies.
  const currencyProgress = activeCurrencies.map((currencyCode) => {
    const totals = currencyTotals[currencyCode];

    return {
      currency: currencyCode,
      ...totals,
      progress:
        totals.total > 0
          ? Math.round((totals.paid / totals.total) * 100)
          : 0
    };
  });

  // ==========================================
  // SEARCH PROJECTS
  // ==========================================
  const filteredProjects = projects.filter((project) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      project.projectTitle.toLowerCase().includes(search) ||
      project.clientName.toLowerCase().includes(search);

    const milestones = project.milestones || [];

    const allPaid =
      milestones.length > 0 &&
      milestones.every((milestone) => milestone.isPaid);

    const hasPending = milestones.some(
      (milestone) => !milestone.isPaid
    );

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "paid" && allPaid) ||
      (statusFilter === "pending" && hasPending);

    return matchesSearch && matchesStatus;
  });

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="app">

      {/* ======================================
          HEADER
      ====================================== */}
      <header className="header">
        <div>
          <h1>Freelancer Invoice Tracker</h1>

          <p>
            Manage your projects, milestones and payments
          </p>
        </div>

        <button
          className="add-button"
          onClick={openForm}
        >
          + Add Project
        </button>
      </header>


      {/* ======================================
          DASHBOARD CARDS
      ====================================== */}
      <section className="dashboard-cards">

        <div className="dashboard-card">
          <span className="card-label">
            Total Projects
          </span>

          <h2>{totalProjects}</h2>

          <p>Active projects</p>
        </div>


        <div className="dashboard-card">
          <span className="card-label">
            Total Value
          </span>

          <div className="currency-total-list">
            {Object.entries(currencyTotals).map(
              ([currency, values]) => {

                if (values.total === 0) return null;

                return (
                  <div
                    className="currency-total-item"
                    key={currency}
                  >
                    <span className="currency-code">
                      {currency}
                    </span>

                    <strong>
                      {formatCurrency(
                        currency,
                        values.total
                      )}
                    </strong>
                  </div>
                );
              }
            )}
          </div>

          <p>Project value by currency</p>
        </div>


        <div className="dashboard-card">
          <span className="card-label">
            Paid
          </span>

          <div className="currency-total-list">
            {Object.entries(currencyTotals).map(
              ([currency, values]) => {

                if (values.total === 0) return null;

                return (
                  <div
                    className="currency-total-item"
                    key={currency}
                  >
                    <span className="currency-code">
                      {currency}
                    </span>

                    <strong>
                      {formatCurrency(
                        currency,
                        values.paid
                      )}
                    </strong>
                  </div>
                );
              }
            )}
          </div>

          <p>Completed payments by currency</p>
        </div>


        <div className="dashboard-card">
          <span className="card-label">
            Pending
          </span>

          <div className="currency-total-list">
            {Object.entries(currencyTotals).map(
              ([currency, values]) => {

                if (values.total === 0) return null;

                return (
                  <div
                    className="currency-total-item"
                    key={currency}
                  >
                    <span className="currency-code">
                      {currency}
                    </span>

                    <strong>
                      {formatCurrency(
                        currency,
                        values.pending
                      )}
                    </strong>
                  </div>
                );
              }
            )}
          </div>

          <p>Outstanding payments by currency</p>
        </div>

      </section>


      {/* ======================================
          PAYMENT PROGRESS
      ====================================== */}

      <section className="payment-progress-card">

        <div className="payment-progress-header">

          <div>
            <h3>Payment Progress</h3>

            <p>
              Track payment progress separately for each currency.
            </p>
          </div>

        </div>

        {currencyProgress.length === 0 ? (
          <p>No project payments to track yet.</p>
        ) : (
          currencyProgress.map((item) => (
            <div key={item.currency} style={{ marginBottom: "14px" }}>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "6px"
                }}
              >
                <strong>{item.currency}</strong>
                <strong>{item.progress}%</strong>
              </div>

              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${item.progress}%` }}
                ></div>
              </div>

              <div className="progress-info">
                <span>
                  Paid: {formatCurrency(item.currency, item.paid)}
                </span>

                <span>
                  Pending: {formatCurrency(item.currency, item.pending)}
                </span>
              </div>

            </div>
          ))
        )}

      </section>


      {/* ======================================
          PROJECTS SECTION
      ====================================== */}
      <section className="projects-section">

        <div className="section-header">

          <div>
            <h2>Projects</h2>

            <p>
              Your recent freelance projects
            </p>

            <div className="search-box">
              <input
                type="text"
                placeholder="Search by project or client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="filter-buttons">

              <button
                className={statusFilter === "all" ? "active" : ""}
                onClick={() => setStatusFilter("all")}
              >
                All
              </button>

              <button
                className={statusFilter === "paid" ? "active" : ""}
                onClick={() => setStatusFilter("paid")}
              >
                Paid
              </button>

              <button
                className={statusFilter === "pending" ? "active" : ""}
                onClick={() => setStatusFilter("pending")}
              >
                Pending
              </button>

            </div>
          </div>

          <button
            className="refresh-button"
            onClick={fetchProjects}
          >
            Refresh
          </button>

        </div>


        {loading && (
          <div className="message">
            Loading projects...
          </div>
        )}


        {error && (
          <div className="error-message">
            {error}
          </div>
        )}


        {!loading &&
          !error &&
          projects.length === 0 && (
            <div className="empty-state">

              <div className="empty-icon">
                📋
              </div>

              <h3>
                No projects yet
              </h3>

              <p>
                Add your first freelance project to start
                tracking invoices and milestones.
              </p>

              <button
                className="add-button"
                onClick={openForm}
              >
                + Add Your First Project
              </button>

            </div>
          )}


        {!loading &&
          !error &&
          projects.length > 0 && (

            <div className="projects-grid">

              {filteredProjects.map((project) => {

                const projectTotal =
                  (project.milestones || []).reduce(
                    (sum, milestone) =>
                      sum +
                      Number(milestone.amount || 0),
                    0
                  );

                const projectPaid =
                  (project.milestones || [])
                    .filter(
                      (milestone) => milestone.isPaid
                    )
                    .reduce(
                      (sum, milestone) =>
                        sum +
                        Number(milestone.amount || 0),
                      0
                    );
const projectMilestones = project.milestones || [];

const allMilestonesPaid =
  projectMilestones.length > 0 &&
  projectMilestones.every(
    (milestone) => milestone.isPaid
  );

const anyMilestonePaid =
  projectMilestones.some(
    (milestone) => milestone.isPaid
  );

let projectStatus = "Pending";

if (allMilestonesPaid) {
  projectStatus = "Completed";
} else if (anyMilestonePaid) {
  projectStatus = "In Progress";
}
// ==========================================
// DEADLINE STATUS
// ==========================================

const today = new Date();
today.setHours(0, 0, 0, 0);

const projectDeadline = new Date(project.deadline);
projectDeadline.setHours(0, 0, 0, 0);

const daysRemaining = Math.ceil(
  (projectDeadline - today) /
  (1000 * 60 * 60 * 24)
);

let deadlineStatus = "Upcoming";

if (projectStatus === "Completed") {
  deadlineStatus = "Completed";
} else if (daysRemaining < 0) {
  deadlineStatus = "Overdue";
} else if (daysRemaining <= 7) {
  deadlineStatus = "Due Soon";
}
                return (
                  <div
                    className="project-card"
                    key={project._id}
                  >

                    <div className="project-top">

                      <div>

                        <h3>
                          {project.projectTitle}
                        </h3>

                        <p className="client-name">
                          Client: {project.clientName}
                        </p>

                      </div>

                      <div className="project-actions">

                        <span className="currency">
                          {project.currency}
                        </span>

                        <button
                          className="edit-button"
                          onClick={() => openEditForm(project)}
                        >
                          Edit
                        </button>

                        <button
                          className="view-button"
                          onClick={() => setSelectedProject(project)}
                        >
                          View
                        </button>

                        <button
                          className="delete-button"
                          onClick={() => deleteProject(project)}
                        >
                          Delete
                        </button>

                      </div>

                    </div>

                    <div className="project-status-row">

                      <span className="project-status-label">
                         Project Status
                      </span>

                      <span
                        className={`project-status ${
                          projectStatus === "Completed"
                          ? "status-completed"
                          : projectStatus === "In Progress"
                          ? "status-in-progress"
                          : "status-project-pending"
                        }`}
                      >
                        {projectStatus}
                      </span>

                    </div>
                  <div className="deadline-status-row">

                    <span className="deadline-status-label">
                      Deadline Status
                    </span>

                    <span
                      className={`deadline-status ${
                        deadlineStatus === "Completed"
                        ? "deadline-completed"
                        : deadlineStatus === "Overdue"
                        ? "deadline-overdue"
                        : deadlineStatus === "Due Soon"
                        ? "deadline-due-soon"
                        : "deadline-upcoming"
                     }`}
                    >
                      {deadlineStatus}
                    </span>

</div>
                    <div className="project-info">

                      <div>
                        <span>
                          Deadline
                        </span>

                        <strong>
                          {new Date(
                            project.deadline
                          ).toLocaleDateString()}
                        </strong>
                      </div>


                      <div>
                        <span>
                          Total
                        </span>

                        <strong>
                          {formatCurrency(project.currency, projectTotal)}
                        </strong>
                      </div>


                      <div>
                        <span>
                          Paid
                        </span>

                        <strong>
                          {formatCurrency(project.currency, projectPaid)}
                        </strong>
                      </div>

                    </div>


                    <div className="milestones">

                      <h4>
                        Milestones
                      </h4>

                      {project.milestones?.map(
                        (milestone) => (

                          <div
                            className="milestone"
                            key={milestone._id}
                          >

                            <div>

                              <strong>
                                {milestone.title}
                              </strong>

                              <span>
                                {formatCurrency(
                                  project.currency,
                                  milestone.amount
                                )}
                              </span>

                            </div>


                            <button
                              type="button"
                              className={
                                milestone.isPaid
                                  ? "status paid"
                                  : "status pending"
                              }
                              onClick={() =>
                                toggleMilestone(
                                  project._id,
                                  milestone._id
                                )
                              }
                            >
                              {milestone.isPaid
                                ? "Paid"
                                : "Pending"}
                            </button>

                          </div>

                        )
                      )}

                    </div>

                  </div>
                );
              })}

            </div>
          )}

      </section>


      {/* ======================================
          PROJECT DETAILS MODAL
      ====================================== */}

      {selectedProject && (
        <div className="details-overlay">

          <div className="details-modal">

            <div className="details-header">

              <h2>
                Project Details
              </h2>

              <button
                className="close-details"
                onClick={() => setSelectedProject(null)}
              >
                ×
              </button>

            </div>

            <div className="details-content">

              <div className="detail-item">

                <span>
                  Project
                </span>

                <strong>
                  {selectedProject.projectTitle}
                </strong>

              </div>


              <div className="detail-item">

                <span>
                  Client
                </span>

                <strong>
                  {selectedProject.clientName}
                </strong>

              </div>


              <div className="detail-item">

                <span>
                  Deadline
                </span>

                <strong>
                  {new Date(
                    selectedProject.deadline
                  ).toLocaleDateString()}
                </strong>

              </div>


              <div className="detail-item">

                <span>
                  Currency
                </span>

                <strong>
                  {selectedProject.currency}
                </strong>

              </div>

{/* PROJECT PAYMENT PROGRESS */}

<div className="project-payment-progress">

  <div className="project-progress-header">

    <div>
      <h3>Payment Progress</h3>

      <p>
        Track the payment status of this project.
      </p>
    </div>

    <strong>
      {(() => {
        const total = selectedProject.milestones.reduce(
          (sum, milestone) =>
            sum + Number(milestone.amount || 0),
          0
        );

        const paid = selectedProject.milestones
          .filter((milestone) => milestone.isPaid)
          .reduce(
            (sum, milestone) =>
              sum + Number(milestone.amount || 0),
            0
          );

        return total > 0
          ? Math.round((paid / total) * 100)
          : 0;
      })()}%
    </strong>

  </div>

  <div className="project-progress-bar">

    <div
      className="project-progress-fill"
      style={{
        width: `${(() => {
          const total = selectedProject.milestones.reduce(
            (sum, milestone) =>
              sum + Number(milestone.amount || 0),
            0
          );

          const paid = selectedProject.milestones
            .filter((milestone) => milestone.isPaid)
            .reduce(
              (sum, milestone) =>
                sum + Number(milestone.amount || 0),
              0
            );

          return total > 0
            ? Math.round((paid / total) * 100)
            : 0;
        })()}%`
      }}
    ></div>

  </div>

</div>
              <div className="details-summary">

                <div>

                  <span>
                    Total
                  </span>

                  <strong>
                    {formatCurrency(
                      selectedProject.currency,
                      selectedProject.milestones.reduce(
                        (sum, milestone) =>
                          sum + Number(milestone.amount || 0),
                        0
                      )
                    )}
                  </strong>

                </div>


                <div>

                  <span>
                    Paid
                  </span>

                  <strong>
                    {formatCurrency(
                      selectedProject.currency,
                      selectedProject.milestones
                        .filter((milestone) => milestone.isPaid)
                        .reduce(
                          (sum, milestone) =>
                            sum + Number(milestone.amount || 0),
                          0
                        )
                    )}
                  </strong>

                </div>


                <div>

                  <span>
                    Pending
                  </span>

                  <strong>
                    {formatCurrency(
                      selectedProject.currency,
                      selectedProject.milestones.reduce(
                        (sum, milestone) =>
                          sum + Number(milestone.amount || 0),
                        0
                      ) -
                      selectedProject.milestones
                        .filter((milestone) => milestone.isPaid)
                        .reduce(
                          (sum, milestone) =>
                            sum + Number(milestone.amount || 0),
                          0
                        )
                    )}
                  </strong>

                </div>

              </div>


              <h3>
                Milestones
              </h3>


              <div className="details-milestones">

                {selectedProject.milestones.map(
                  (milestone) => (

                    <div
                      className="details-milestone"
                      key={milestone._id}
                    >

                      <div>

                        <strong>
                          {milestone.title}
                        </strong>

                        {milestone.isPaid &&
                          milestone.paidDate && (
                            <small>
                              Paid on{" "}
                              {new Date(
                                milestone.paidDate
                              ).toLocaleDateString()}
                            </small>
                          )}

                      </div>


                      <div className="milestone-detail-right">

                        <strong>
                          {formatCurrency(
                            selectedProject.currency,
                            milestone.amount
                          )}
                        </strong>

                        <span
                          className={
                            milestone.isPaid
                              ? "status-paid"
                              : "status-pending"
                          }
                        >
                          {milestone.isPaid
                            ? "Paid"
                            : "Pending"}
                        </span>

                      </div>

                    </div>

                  )
                )}

              </div>

            </div>

          </div>

        </div>
      )}


      {/* ======================================
          DELETE PROJECT CONFIRMATION MODAL
      ====================================== */}

      {deleteProjectTarget && (
        <div
          className="delete-modal-overlay"
          onClick={cancelDeleteProject}
        >
          <div
            className="delete-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="delete-modal-icon">
              !
            </div>

            <div className="delete-modal-content">
              <h2>Delete Project?</h2>

              <p>
                Are you sure you want to delete
                <strong>
                  {" "}
                  "{deleteProjectTarget.projectTitle}"
                </strong>
                ?
              </p>

              <span className="delete-modal-warning">
                This action cannot be undone.
              </span>
            </div>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="delete-cancel-button"
                onClick={cancelDeleteProject}
              >
                Cancel
              </button>

              <button
                type="button"
                className="delete-confirm-button"
                onClick={confirmDeleteProject}
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================
          ADD PROJECT MODAL
      ====================================== */}

      {showForm && (

        <div
          className="modal-overlay"
          onClick={closeForm}
        >

          <div
            className="modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>

                <h2>
                  {editingProjectId
                    ? "Edit Project"
                    : "Add New Project"}
                </h2>

                <p>
                  Enter your project and milestone details.
                </p>

              </div>

              <button
                className="close-button"
                onClick={closeForm}
                disabled={saving}
              >
                ×
              </button>

            </div>


            <form
              onSubmit={handleCreateProject}
            >

              {/* CLIENT NAME */}

              <div className="form-group">

                <label>
                  Client Name
                </label>

                <input
                  type="text"
                  placeholder="e.g. Rahul Enterprises"
                  value={clientName}
                  onChange={(event) =>
                    setClientName(event.target.value)
                  }
                />

              </div>


              {/* PROJECT TITLE */}

              <div className="form-group">

                <label>
                  Project Title
                </label>

                <input
                  type="text"
                  placeholder="e.g. Business Website"
                  value={projectTitle}
                  onChange={(event) =>
                    setProjectTitle(event.target.value)
                  }
                />

              </div>


              {/* CURRENCY + DEADLINE */}

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Currency
                  </label>

                  <select
                    value={currency}
                    onChange={(event) =>
                      setCurrency(event.target.value)
                    }
                  >

                    <option value="INR">
                      INR - ₹
                    </option>

                    <option value="USD">
                      USD - $
                    </option>

                    <option value="EUR">
                      EUR - €
                    </option>

                    <option value="GBP">
                      GBP - £
                    </option>

                  </select>

                </div>


                <div className="form-group">

                  <label>
                    Deadline
                  </label>

                  <input
                    type="date"
                    value={deadline}
                    onChange={(event) =>
                      setDeadline(event.target.value)
                    }
                  />

                </div>

              </div>


              {/* MILESTONES */}

              <div className="milestone-form-section">

                <div className="milestone-form-header">

                  <div>

                    <h3>
                      Milestones
                    </h3>

                    <p>
                      Add the payments you expect for this project.
                    </p>

                  </div>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={addMilestone}
                  >
                    + Add Milestone
                  </button>

                </div>


                {milestones.map(
                  (milestone, index) => (

                    <div
                      className="milestone-form-row"
                      key={index}
                    >

                      <input
                        type="text"
                        placeholder="Milestone title"
                        value={milestone.title}
                        onChange={(event) =>
                          updateMilestone(
                            index,
                            "title",
                            event.target.value
                          )
                        }
                      />


                      <input
                        type="number"
                        min="1"
                        placeholder="Amount"
                        value={milestone.amount}
                        onChange={(event) =>
                          updateMilestone(
                            index,
                            "amount",
                            event.target.value
                          )
                        }
                      />


                      {milestones.length > 1 && (
                        <button
                          type="button"
                          className="remove-button"
                          onClick={() =>
                            removeMilestone(index)
                          }
                        >
                          ×
                        </button>
                      )}

                    </div>

                  )
                )}

              </div>


              {/* ERROR */}

              {formError && (
                <div className="form-error">
                  {formError}
                </div>
              )}


              {/* BUTTONS */}

              <div className="form-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="submit-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingProjectId
                      ? "Save Changes"
                      : "Create Project"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default App;