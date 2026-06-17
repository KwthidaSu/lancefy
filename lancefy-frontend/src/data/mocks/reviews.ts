import { Review } from "@/types";

export const mockReviews: Review[] = [
  // --- REVIEWS RECEIVED BY FREELANCER-1 (EMMA) ---
  {
    id: "r-emma-1",
    project_id: "p1",
    reviewer_id: "client-1",
    reviewee_id: "freelancer-1",
    rating: 5,
    comment:
      "Emma is simply the best! She captured our vision perfectly. The character designs are unique and full of life.",
    created_at: "2023-11-15T10:00:00Z",
  },
  {
    id: "r-emma-2",
    project_id: "p4",
    reviewer_id: "client-3",
    reviewee_id: "freelancer-1",
    rating: 4.8,
    comment:
      "Great communication and very flexible with revisions. The final artwork was stunning.",
    created_at: "2023-12-05T14:20:00Z",
  },
  {
    id: "r-emma-3",
    project_id: "p5",
    reviewer_id: "client-2",
    reviewee_id: "freelancer-1",
    rating: 5,
    comment:
      "Perfect delivery. The assets were game-ready and optimized. Will definitely work with Emma again.",
    created_at: "2024-01-10T09:15:00Z",
  },
  {
    id: "r-emma-4",
    project_id: "p8",
    reviewer_id: "client-4",
    reviewee_id: "freelancer-1",
    rating: 4.9,
    comment:
      "Emma went above and beyond to meet our tight deadline. A true professional.",
    created_at: "2024-01-15T08:00:00Z",
  },
  {
    id: "r-emma-5",
    project_id: "p9",
    reviewer_id: "client-1",
    reviewee_id: "freelancer-1",
    rating: 4.5,
    comment:
      "Solid work on the concept art. Just a minor delay in the draft phase, but catch up quickly.",
    created_at: "2023-09-01T11:00:00Z",
  },
  {
    id: "r-emma-6",
    project_id: "p10",
    reviewer_id: "client-2",
    reviewee_id: "freelancer-1",
    rating: 5,
    comment:
      "Incredible attention to detail. The lighting in the illustration is masterful.",
    created_at: "2023-08-15T16:30:00Z",
  },
  {
    id: "r-emma-7",
    project_id: "p11",
    reviewer_id: "client-3",
    reviewee_id: "freelancer-1",
    rating: 4.0,
    comment:
      "Good output, but communication could be a bit faster during weekends.",
    created_at: "2023-07-20T09:00:00Z",
  },
  {
    id: "r-emma-8",
    project_id: "p12",
    reviewer_id: "client-4",
    reviewee_id: "freelancer-1",
    rating: 5,
    comment: "Absolutely love the style! Fits our indie game perfectly.",
    created_at: "2023-06-10T13:45:00Z",
  },
  {
    id: "r-emma-9",
    project_id: "p13",
    reviewer_id: "client-1",
    reviewee_id: "freelancer-1",
    rating: 5,
    comment: "Consistent quality as always. Emma is our go-to artist.",
    created_at: "2023-05-05T10:15:00Z",
  },
  {
    id: "r-emma-10",
    project_id: "p14",
    reviewer_id: "client-2",
    reviewee_id: "freelancer-1",
    rating: 4.7,
    comment:
      "Very creative interpretation of the prompt. exceeded expectations.",
    created_at: "2023-04-22T15:20:00Z",
  },
  {
    id: "r-emma-11",
    project_id: "p15",
    reviewer_id: "client-3",
    reviewee_id: "freelancer-1",
    rating: 5,
    comment: "Fast, reliable, and talented. What more can you ask for?",
    created_at: "2023-03-30T11:50:00Z",
  },
  {
    id: "r-emma-12",
    project_id: "p16",
    reviewer_id: "client-4",
    reviewee_id: "freelancer-1",
    rating: 4.2,
    comment:
      "Good work, though the initial sketches were a bit far from the brief. Final result was great though.",
    created_at: "2023-02-14T09:10:00Z",
  },

  // --- REVIEWS GIVEN BY FREELANCER-1 (EMMA) ---
  {
    id: "g-emma-1",
    project_id: "p2",
    reviewer_id: "freelancer-1",
    reviewee_id: "client-2",
    rating: 4.5,
    comment:
      "Michael provided clear requirements and constructive feedback. A pleasure to work with.",
    created_at: "2023-10-20T14:30:00Z",
  },
  {
    id: "g-emma-2",
    project_id: "p1",
    reviewer_id: "freelancer-1",
    reviewee_id: "client-1",
    rating: 5,
    comment:
      "Sarah is a fantastic client. Very clear vision and prompt payments.",
    created_at: "2023-11-16T11:00:00Z",
  },
  {
    id: "g-emma-3",
    project_id: "p4",
    reviewer_id: "freelancer-1",
    reviewee_id: "client-3",
    rating: 4.8,
    comment:
      "David was very reasonable with the timeline adjustments. Good experience.",
    created_at: "2023-12-06T09:00:00Z",
  },
  {
    id: "g-emma-4",
    project_id: "p5",
    reviewer_id: "freelancer-1",
    reviewee_id: "client-2",
    rating: 5,
    comment:
      "Another great project with Michael. Smooth process from start to finish.",
    created_at: "2024-01-11T10:00:00Z",
  },
  {
    id: "g-emma-5",
    project_id: "p9",
    reviewer_id: "freelancer-1",
    reviewee_id: "client-1",
    rating: 5,
    comment:
      "Sarah always provides detailed briefs which makes my job much easier.",
    created_at: "2023-09-02T13:30:00Z",
  },
  {
    id: "g-emma-6",
    project_id: "p11",
    reviewer_id: "freelancer-1",
    reviewee_id: "client-3",
    rating: 4.0,
    comment: "Communication was a bit sporadic, but we got there in the end.",
    created_at: "2023-07-21T15:00:00Z",
  },

  // --- REVIEWS FOR CLIENT-1 (SARAH) ---
  {
    id: "r-sarah-1",
    project_id: "p-other-1",
    reviewer_id: "freelancer-2",
    reviewee_id: "client-1",
    rating: 5,
    comment: "Sarah is amazing to work with. She knows exactly what she wants.",
    created_at: "2023-10-05T12:00:00Z",
  },
  {
    id: "r-sarah-2",
    project_id: "p-other-2",
    reviewer_id: "freelancer-3",
    reviewee_id: "client-1",
    rating: 4.9,
    comment:
      "Professional and friendly. Highly recommended for any freelancer.",
    created_at: "2023-11-20T14:00:00Z",
  },
  {
    id: "r-sarah-3",
    project_id: "p-other-3",
    reviewer_id: "freelancer-4",
    reviewee_id: "client-1",
    rating: 5,
    comment: "Payment was immediate upon completion. A+ client.",
    created_at: "2023-12-15T16:00:00Z",
  },

  // --- REVIEWS FOR OTHER FREELANCERS ---
  {
    id: "r-alex-1",
    project_id: "p6",
    reviewer_id: "client-4",
    reviewee_id: "freelancer-2", // Alex
    rating: 4.7,
    comment:
      "Alex created a modern and clean brand identity for us. Very impressed.",
    created_at: "2023-09-28T16:45:00Z",
  },
  {
    id: "r-jordan-1",
    project_id: "p7",
    reviewer_id: "client-1",
    reviewee_id: "freelancer-3", // Jordan
    rating: 5,
    comment:
      "Incredible 3D modeling skills. The product renders look clearer than reality!",
    created_at: "2023-12-12T10:30:00Z",
  },
  {
    id: "r-lisa-1",
    project_id: "p-web-1",
    reviewer_id: "client-3",
    reviewee_id: "freelancer-4", // Lisa
    rating: 4.5,
    comment:
      "Lisa built a responsive site very quickly. Code quality is great.",
    created_at: "2024-01-05T09:30:00Z",
  },
  {
    id: "r-tom-1",
    project_id: "p-video-1",
    reviewer_id: "client-2",
    reviewee_id: "freelancer-5", // Tom
    rating: 4.8,
    comment:
      "The video edit was high energy and exactly what we needed for social media.",
    created_at: "2024-01-08T11:15:00Z",
  },
];
