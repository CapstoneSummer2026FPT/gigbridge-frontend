import DB from '../database/db';
import type { User, UserRole } from '../../types/models/User';
import type { ClientProfile, FreelancerProfile } from '../../types/models/Profile';
import type { LoginResponse, UserDTO } from '../../types/models/Auth';
import type { ApiResponse } from '../../types/models/common';

export interface LoginPayload { email: string; password: string; }
export interface LoginResult { user: User; token: string; }

function sanitizeErrorMessage(error: any): string {
  if (typeof error === 'string') return error;
  if (Array.isArray(error)) return error.join(', ');
  if (typeof error === 'object' && error !== null) {
    return Object.values(error).flat().join(', ');
  }
  return 'An error occurred';
}

export function mapUserDTOToUser(dto: UserDTO): User {
  const nameParts = dto.fullName ? dto.fullName.trim().split(/\s+/) : ['', ''];
  const first_name = nameParts[0] || '';
  const last_name = nameParts.slice(1).join(' ') || '';

  return {
    id: dto.userId || '',
    email: dto.email || '',
    first_name,
    last_name,
    full_name: dto.fullName || '',
    phone_number: dto.phoneNumber || null,
    role: dto.role as UserRole, // 0 = Client, 1 = Freelancer, 2 = Admin
    is_email_verified: dto.isEmailVerified,
    is_active: dto.isActive,
    preferred_language: dto.preferredLanguage || 'en',
    last_login_at: null,
    login_failed_time: null,
    access_failed_count: 0,
    gigcoin_balance: 100, // default/mock
    created_at: dto.createdAt,
    updated_at: dto.updatedAt || dto.createdAt,
  };
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const authHandlers = {
  async login(payload: LoginPayload): Promise<LoginResult> {
    const API = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7094';

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: payload.email, password: payload.password }),
        credentials: 'include' // Receive HttpOnly refresh cookie
      });

      if (!res.ok) {
        let errorMsg = "An error occurred during login";
        if (res.headers.get('content-type')?.includes('application/json')) {
          const errorData = await res.json();
          errorMsg = sanitizeErrorMessage(errorData.errors || errorData.message || errorData);
        }
        throw new Error(errorMsg);
      }

      const result: ApiResponse<LoginResponse> = await res.json();

      if (!result.success) {
        throw new Error(result.message || "Login failed");
      }

      const data = result.data;
      const userDTO = data?.user;

      if (!data || !data.token || !userDTO) {
        throw new Error("Invalid login response");
      }

      const mappedUser = mapUserDTOToUser(userDTO);
      return { user: mappedUser, token: data.token };
    } catch (error: any) {
      // Fallback to mock DB if the backend is offline/unreachable
      if (error instanceof TypeError && (error.message.includes('Failed to fetch') || error.message.includes('fetch failed'))) {
        console.warn("Backend API is unreachable. Falling back to Mock DB for development.", error);

        await delay(600);
        let user = DB.getUserByEmail(payload.email);

        if (!user) {
          const role: UserRole = 1; // Default to freelancer
          user = {
            id: `u_demo_${Date.now()}`,
            email: payload.email,
            first_name: 'Demo',
            last_name: 'User',
            full_name: 'Demo User',
            phone_number: null,
            role,
            is_email_verified: false,
            is_active: true,
            preferred_language: 'en',
            last_login_at: new Date().toISOString(),
            login_failed_time: null,
            access_failed_count: 0,
            gigcoin_balance: 100,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          DB.addUser(user);
        }
        return { user, token: `mock-jwt-${user.id}-${Date.now()}` };
      }

      // Propagate actual API error messages
      throw error;
    }
  },

  async signup(email: string, password: string, firstName: string, lastName: string, role: UserRole): Promise<LoginResult> {
    await delay(800);
    
    // Check if user exists
    const existingUser = DB.getUserByEmail(email);
    if (existingUser) throw new Error('User already exists');

    // Create new user
    const newUser: User = {
      id: `u_${role === 0 ? 'client' : 'freelancer'}_${Date.now()}`,
      email,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      phone_number: null,
      role,
      is_email_verified: false,
      is_active: true,
      preferred_language: 'en',
      last_login_at: new Date().toISOString(),
      login_failed_time: null,
      access_failed_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    DB.addUser(newUser);
    return { user: newUser, token: `mock-jwt-${newUser.id}-${Date.now()}` };
  },

  async loginAsDemo(role: 'client' | 'freelancer' | 'admin'): Promise<LoginResult> {
    await delay(300);
    const roleMap: Record<string, string> = {
      client: 'demo_client_001',
      freelancer: 'demo_freelancer_001',
      admin: 'demo_admin_001',
    };
    const user = DB.getUserById(roleMap[role]);
    if (!user) throw new Error('User not found');
    return { user, token: `mock-jwt-${user.id}-${Date.now()}` };
  },

  async getProfile(userId: string) {
    await delay(200);
    const user = DB.getUserById(userId);
    if (!user) throw new Error('User not found');
    
    if (user.role === 1) {
      return { user, freelancerProfile: DB.getFreelancerProfile(userId) };
    }
    if (user.role === 0) {
      return { user, clientProfile: DB.getClientProfile(userId) };
    }
    return { user, clientProfile: null, freelancerProfile: null };
  },

  async createClientProfile(userId: string, profileData: Partial<ClientProfile>): Promise<ClientProfile> {
    await delay(500);
    
    const profile: ClientProfile = {
      id: `cp_${Date.now()}`,
      user_id: userId,
      company_name: profileData.company_name || '',
      company_website: profileData.company_website || null,
      company_size: profileData.company_size || 0,
      industry: profileData.industry || '',
      company_description: profileData.company_description || null,
      location: profileData.location || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    DB.addClientProfile(profile);
    return profile;
  },

  async createFreelancerProfile(userId: string, profileData: Partial<FreelancerProfile>): Promise<FreelancerProfile> {
    await delay(500);
    
    const profile: FreelancerProfile = {
      id: `fp_${Date.now()}`,
      user_id: userId,
      title: profileData.title || '',
      bio: profileData.bio || '',
      hourly_rate: profileData.hourly_rate || 0,
      experience_level: profileData.experience_level || 0,
      availability: profileData.availability || 0,
      location: profileData.location || '',
      profile_completion_score: 50,
      rating: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    DB.addFreelancerProfile(profile);
    return profile;
  },
};