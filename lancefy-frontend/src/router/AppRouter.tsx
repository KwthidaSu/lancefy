import { Suspense, lazy, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "@/auth/require-auth";

import AppShell from "@/components/layout/AppShell";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GalleryLayout from "@/components/layout/GalleryLayout";
import ExploreLayout from "@/components/layout/ExploreLayout";
import AccountSettingsLayout from "@/components/layout/AccountSettingsLayout";
import AdminShell from "@/components/layout/AdminShell";

const Landing = lazy(() => import("@/pages/Landing"));
const AcceptInvitePage = lazy(() => import("@/pages/auth/AcceptInvitePage"));

const Dashboard = lazy(() => import("@/pages/dashboard/Dashboard"));
const FinancePage = lazy(() => import("@/pages/dashboard/FinancePage"));

const ProfilePage = lazy(() => import("@/pages/profile/ProfilePage"));
const MyPortfolioPage = lazy(() => import("@/pages/profile/MyPortfolioPage"));
const PublicUserProfilePage = lazy(
  () => import("@/pages/profile/PublicUserProfilePage")
);

const MyProjectsPage = lazy(() => import("@/pages/projects/MyProjectsPage"));
const ProjectDetailPage = lazy(
  () => import("@/pages/projects/ProjectDetailPage")
);
const ProjectManagePage = lazy(
  () => import("@/pages/projects/ProjectManagePage")
);
const CreateProjectPage = lazy(
  () => import("@/pages/projects/CreateProjectPage")
);
const ProjectReviewPage = lazy(
  () => import("@/pages/projects/ProjectReviewPage")
);
const ProjectWorkspacePage = lazy(
  () => import("@/pages/projects/ProjectWorkspacePage")
);
const MilestoneSubmitPage = lazy(
  () => import("@/pages/projects/MilestoneSubmitPage")
);
const MilestoneReviewPage = lazy(
  () => import("@/pages/projects/MilestoneReviewPage")
);

const MyWorkPage = lazy(() => import("@/pages/jobs/MyWorkPage"));
const JobBoardPage = lazy(() => import("@/pages/jobs/JobBoardPage"));
const JobDetailPage = lazy(() => import("@/pages/jobs/JobDetailPage"));
const CreateJobPage = lazy(() => import("@/pages/jobs/CreateJobPage"));

const MyProposalsPage = lazy(
  () => import("@/pages/proposals/MyProposalsPage")
);
const ProposalDetailPage = lazy(
  () => import("@/pages/proposals/ProposalDetailPage")
);

const PaymentsPage = lazy(() => import("@/pages/payments/PaymentsPage"));
const MessagesPage = lazy(() => import("@/pages/messages/MessagesPage"));
const CalendarPage = lazy(() => import("@/pages/calendar/CalendarPage"));
const CommunityPage = lazy(() => import("@/pages/community/CommunityPage"));
const CommunityPostDetailPage = lazy(
  () => import("@/pages/community/CommunityPostDetailPage")
);
const CommunityMyPostsPage = lazy(
  () => import("@/pages/community/CommunityMyPostsPage")
);

const JobsPage = lazy(() => import("@/pages/explore/JobsPage"));
const FreelancersPage = lazy(
  () => import("@/pages/explore/FreelancersPage")
);
const FreelancerDetailPage = lazy(
  () => import("@/pages/explore/FreelancerDetailPage")
);
const FreelancerPortfolioPage = lazy(
  () => import("@/pages/explore/FreelancerPortfolioPage")
);

const NotificationsPage = lazy(() => import("@/pages/Notifications"));
const ActivityPage = lazy(() => import("@/pages/Activity"));

const DisputePage = lazy(() => import("@/pages/disputes/DisputePage"));
const DisputeListPage = lazy(
  () => import("@/pages/disputes/DisputeListPage")
);
const DisputeDetailPage = lazy(
  () => import("@/pages/disputes/DisputeDetailPage")
);

const ReviewsPage = lazy(() => import("@/pages/reviews/Reviews"));
const CreateReview = lazy(() => import("@/pages/reviews/CreateReview"));

const ProfileSettingsPage = lazy(() => import("@/pages/settings/Profile"));
const NotificationSettingsPage = lazy(
  () => import("@/pages/settings/NotificationSettings")
);

const KycPage = lazy(() => import("@/pages/kyc/KycPage"));
const KycStatusPage = lazy(() => import("@/pages/kyc/KycStatusPage"));
const AccountVerificationPage = lazy(
  () => import("@/pages/account/AccountVerificationPage")
);

const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminUsersPage = lazy(
  () => import("@/pages/admin/AdminUsersManagePage")
);
const AdminDisputesPage = lazy(
  () => import("@/pages/admin/AdminDisputesPage")
);
const KycReviewPage = lazy(() => import("@/pages/admin/KycReviewPage"));
const KycDetailPage = lazy(() => import("@/pages/admin/KycDetailPage"));
const AdminCommunityPage = lazy(
  () => import("@/pages/admin/AdminCommunityPage")
);
const AdminCommunityPostDetailPage = lazy(
  () => import("@/pages/admin/AdminCommunityPostDetailPage")
);

function RouteFallback() {
  return (
    <div role="status" className="p-6 text-sm text-text-muted">
      Loading...
    </div>
  );
}

function renderLazyRoute(element: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={renderLazyRoute(<Landing />)} />
      <Route
        path="/invite/accept"
        element={renderLazyRoute(<AcceptInvitePage />)}
      />

      <Route
        path="/app"
        element={
          <RequireAuth zone="user">
            <AppShell />
          </RequireAuth>
        }
      >
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={renderLazyRoute(<Dashboard />)} />
          <Route path="profile" element={renderLazyRoute(<ProfilePage />)} />
          <Route
            path="portfolio"
            element={<Navigate to="/app/account/portfolio" replace />}
          />
          <Route
            path="users/:id"
            element={renderLazyRoute(<PublicUserProfilePage />)}
          />

          <Route path="projects" element={renderLazyRoute(<MyProjectsPage />)} />
          <Route
            path="projects/create"
            element={<Navigate to="/app/jobs/create" replace />}
          />
          <Route
            path="projects/:id/edit"
            element={renderLazyRoute(<CreateProjectPage mode="edit" />)}
          />
          <Route
            path="projects/:id/review"
            element={renderLazyRoute(<ProjectReviewPage />)}
          />
          <Route
            path="projects/:id/manage"
            element={renderLazyRoute(<ProjectManagePage />)}
          />
          <Route
            path="projects/:id/workspace"
            element={renderLazyRoute(<ProjectWorkspacePage />)}
          />
          <Route
            path="projects/:id/milestones/:milestoneId/submit"
            element={renderLazyRoute(<MilestoneSubmitPage />)}
          />
          <Route
            path="projects/:id/milestones/:milestoneId/review"
            element={renderLazyRoute(<MilestoneReviewPage />)}
          />
          <Route
            path="projects/:id"
            element={renderLazyRoute(<ProjectDetailPage />)}
          />

          <Route path="work" element={renderLazyRoute(<MyWorkPage />)} />
          <Route path="jobs" element={renderLazyRoute(<JobBoardPage />)} />
          <Route
            path="jobs/create"
            element={renderLazyRoute(<CreateJobPage />)}
          />
          <Route
            path="jobs/mine"
            element={<Navigate to="/app/projects" replace />}
          />
          <Route path="jobs/:id" element={renderLazyRoute(<JobDetailPage />)} />
          <Route
            path="proposals"
            element={renderLazyRoute(<MyProposalsPage />)}
          />
          <Route
            path="proposals/:id"
            element={renderLazyRoute(<ProposalDetailPage />)}
          />
          <Route
            path="payments"
            element={<Navigate to="/app/account/payments" replace />}
          />
          <Route path="finance" element={renderLazyRoute(<FinancePage />)} />
          <Route path="messages" element={renderLazyRoute(<MessagesPage />)} />
          <Route path="calendar" element={renderLazyRoute(<CalendarPage />)} />
          <Route
            path="notifications"
            element={renderLazyRoute(<NotificationsPage />)}
          />
          <Route path="activity" element={renderLazyRoute(<ActivityPage />)} />
          <Route
            path="disputes"
            element={renderLazyRoute(<DisputeListPage />)}
          />
          <Route
            path="disputes/open"
            element={renderLazyRoute(<DisputePage />)}
          />
          <Route
            path="disputes/:id"
            element={renderLazyRoute(<DisputeDetailPage />)}
          />
          <Route path="reviews" element={renderLazyRoute(<ReviewsPage />)} />
          <Route
            path="reviews/create"
            element={renderLazyRoute(<CreateReview />)}
          />
          <Route
            path="settings/profile"
            element={<Navigate to="/app/account/profile" replace />}
          />
          <Route
            path="settings/freelancer"
            element={<Navigate to="/app/account/profile" replace />}
          />
          <Route
            path="settings/notifications"
            element={renderLazyRoute(<NotificationSettingsPage />)}
          />
          <Route
            path="kyc"
            element={<Navigate to="/app/account/verification/start" replace />}
          />
          <Route
            path="kyc/status"
            element={<Navigate to="/app/account/verification/status" replace />}
          />
        </Route>

        <Route path="account" element={<AccountSettingsLayout />}>
          <Route index element={<Navigate to="profile" replace />} />
          <Route
            path="profile"
            element={renderLazyRoute(<ProfileSettingsPage />)}
          />
          <Route
            path="verification"
            element={renderLazyRoute(<AccountVerificationPage />)}
          />
          <Route
            path="verification/start"
            element={renderLazyRoute(<KycPage />)}
          />
          <Route
            path="verification/status"
            element={renderLazyRoute(<KycStatusPage />)}
          />
          <Route
            path="payments"
            element={renderLazyRoute(<PaymentsPage />)}
          />
          <Route
            path="portfolio"
            element={renderLazyRoute(<MyPortfolioPage />)}
          />
          <Route
            path="notifications"
            element={renderLazyRoute(<NotificationSettingsPage />)}
          />
          <Route path="kyc" element={renderLazyRoute(<KycPage />)} />
          <Route
            path="kyc/status"
            element={renderLazyRoute(<KycStatusPage />)}
          />
        </Route>

        <Route element={<GalleryLayout />}>
          <Route
            path="community"
            element={renderLazyRoute(<CommunityPage />)}
          />
          <Route path="gallery" element={<Navigate to="/app/community" replace />} />
          <Route
            path="gallery/mine"
            element={<Navigate to="/app/account/portfolio" replace />}
          />
        </Route>

        <Route
          path="community/posts/:id"
          element={renderLazyRoute(<CommunityPostDetailPage />)}
        />
        <Route
          path="community/mine"
          element={renderLazyRoute(<CommunityMyPostsPage />)}
        />

        <Route
          path="explore/jobs/:id"
          element={renderLazyRoute(<JobDetailPage />)}
        />
        <Route
          path="explore/freelancers/:id/portfolio"
          element={renderLazyRoute(<FreelancerPortfolioPage />)}
        />
        <Route
          path="explore/freelancers/:id"
          element={renderLazyRoute(<FreelancerDetailPage />)}
        />

        <Route element={<ExploreLayout />}>
          <Route
            path="explore/jobs"
            element={renderLazyRoute(<JobsPage />)}
          />
          <Route
            path="explore/freelancers"
            element={renderLazyRoute(<FreelancersPage />)}
          />
        </Route>
      </Route>

      <Route
        path="/admin"
        element={
          <RequireAuth zone="admin">
            <AdminShell />
          </RequireAuth>
        }
      >
        <Route index element={renderLazyRoute(<AdminDashboard />)} />
        <Route path="users" element={renderLazyRoute(<AdminUsersPage />)} />
        <Route path="kyc" element={renderLazyRoute(<KycReviewPage />)} />
        <Route
          path="kyc/:userId"
          element={renderLazyRoute(<KycDetailPage />)}
        />
        <Route
          path="disputes"
          element={renderLazyRoute(<AdminDisputesPage />)}
        />
        <Route
          path="community"
          element={renderLazyRoute(<AdminCommunityPage />)}
        />
        <Route
          path="community/posts/:id"
          element={renderLazyRoute(<AdminCommunityPostDetailPage />)}
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
