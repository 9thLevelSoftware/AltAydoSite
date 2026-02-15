import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '../auth/auth';
import * as userStorage from '@/lib/user-storage';
import { StaleDocumentError } from '@/lib/user-storage';
import { UserShip } from '@/types/user';

// Define the UserShip schema
const userShipSchema = z.object({
  manufacturer: z.string(),
  name: z.string(),
  fleetyardsId: z.string().uuid(),
  image: z.string().optional(),
});

// Profile update validation schema
const profileUpdateSchema = z.object({
  discordName: z.string().optional().nullable(),
  rsiAccountName: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  photo: z.string().optional().nullable(),
  payGrade: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  division: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  ships: z.array(userShipSchema).optional(),
  __v: z.number().int().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the user from storage
    const userId = session.user.id;
    
    const user = await userStorage.getUserById(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Return the profile data (excluding sensitive info)
    const response = {
      id: user.id,
      aydoHandle: user.aydoHandle,
      email: user.email,
      discordName: user.discordName,
      rsiAccountName: user.rsiAccountName,
      bio: user.bio || null,
      photo: user.photo || null,
      payGrade: user.payGrade || null,
      position: user.position || null,
      division: user.division || null,
      timezone: user.timezone || null,
      ships: user.ships || [],
      __v: (user as any).__v ?? 0,
    };
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: `Failed to fetch profile: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    let body;
    
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('PUT Profile - Invalid JSON in request body:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    
    // Handle ships-only updates specially
    const bodyKeys = Object.keys(body).filter(k => k !== '__v');
    const isShipsOnlyUpdate = bodyKeys.length === 1 && bodyKeys[0] === 'ships';
    if (isShipsOnlyUpdate) {
      
      if (!Array.isArray(body.ships)) {
        console.error('PUT Profile - Ships data is not an array:', body.ships);
        return NextResponse.json(
          { error: 'Ships data must be an array' }, 
          { status: 400 }
        );
      }
      
      // Validate each ship in the array
      for (let i = 0; i < body.ships.length; i++) {
        const ship = body.ships[i];
        if (!ship.manufacturer || !ship.name || !ship.fleetyardsId) {
          console.error(`PUT Profile - Invalid ship at index ${i}:`, ship);
          return NextResponse.json(
            { error: `Ship at index ${i} is missing required fields` }, 
            { status: 400 }
          );
        }
      }
      
      // Get existing user first
      const existingUser = await userStorage.getUserById(userId);
      if (!existingUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      // Only update ships field (pass __v for optimistic locking if provided)
      const updatedUser = await userStorage.updateUser(userId, {
        ships: body.ships
      }, body.__v);
      
      if (!updatedUser) {
        console.error(`PUT Profile - Failed to update ships for user ${userId}`);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
      }
      
      // Return the updated profile data
      const response = {
        id: updatedUser.id,
        aydoHandle: updatedUser.aydoHandle,
        email: updatedUser.email,
        discordName: updatedUser.discordName,
        rsiAccountName: updatedUser.rsiAccountName,
        bio: updatedUser.bio || null,
        photo: updatedUser.photo || null,
        payGrade: updatedUser.payGrade || null,
        position: updatedUser.position || null,
        division: updatedUser.division || null,
        timezone: updatedUser.timezone || null,
        ships: updatedUser.ships || [],
        __v: (updatedUser as any).__v ?? 0,
      };

      return NextResponse.json(response);
    }

    // Validate request body (for non-ships-only updates)
    const result = profileUpdateSchema.safeParse(body);
    if (!result.success) {
      const errorMessage = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      console.error(`PUT Profile - Validation error for user ${userId}:`, errorMessage);
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    
    // Get validated data
    const { __v: expectedVersion, ...updates } = result.data;

    // Update the user profile (pass __v for optimistic locking if provided)
    const updatedUser = await userStorage.updateUser(userId, updates, expectedVersion);
    
    if (!updatedUser) {
      console.error(`PUT Profile - Failed to update profile for user ${userId}`);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }
    
    // Return the updated profile data
    const response = {
      id: updatedUser.id,
      aydoHandle: updatedUser.aydoHandle,
      email: updatedUser.email,
      discordName: updatedUser.discordName,
      rsiAccountName: updatedUser.rsiAccountName,
      bio: updatedUser.bio || null,
      photo: updatedUser.photo || null,
      payGrade: updatedUser.payGrade || null,
      position: updatedUser.position || null,
      division: updatedUser.division || null,
      timezone: updatedUser.timezone || null,
      ships: updatedUser.ships || [],
      __v: (updatedUser as any).__v ?? 0,
    };

    return NextResponse.json(response);

  } catch (error: any) {
    if (error instanceof StaleDocumentError) {
      return NextResponse.json(
        { error: 'CONFLICT', message: error.message },
        { status: 409 }
      );
    }
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: `Failed to update profile: ${error.message}` },
      { status: 500 }
    );
  }
}