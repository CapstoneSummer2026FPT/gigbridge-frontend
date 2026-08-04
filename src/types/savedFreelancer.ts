export interface SavedFreelancerDto {
  savedFreelancerId?: string;
  savedFreelancersId?: string;

  freelancerProfileId?: string;
  freelancerProfilesId?: string;
  freelancerUserId?: string;

  fullName?: string;
  avatarUrl?: string;
  title?: string | null;
  bio?: string | null;
  hourlyRate?: number | null;
  location?: string | null;
  ratingAverage?: number | null;
  completedJobs?: number | null;
  skills?: string[];
  availability?: number | null;
  profileCompletionScore?: number | null;

  freelancerCreatedAt?: string;
  savedAt?: string;
}
