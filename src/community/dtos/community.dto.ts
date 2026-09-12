// Placeholder DTOs for community functionality
// Add actual DTOs when community features are implemented

export class CommunityDto {
  id?: string;
  name?: string;
  description?: string;
  createdAt?: Date;
}

export class CommunityListResponseDto {
  communities: CommunityDto[];
}

export class CommunityResponseDto {
  community: CommunityDto;
}
