import { NextRequest, NextResponse } from 'next/server';
import { ActivityType, OperationType } from '@/types/MissionTemplate';
import * as missionTemplateStorage from '@/lib/mission-template-storage';
import { requireAuth } from '@/lib/auth-guards';

// Validation schema for mission template ship roster
const validateShipRoster = (shipRoster: any[]) => {
  if (!Array.isArray(shipRoster)) return false;
  
  for (const ship of shipRoster) {
    if (!ship.size || !ship.category || typeof ship.count !== 'number' || ship.count < 0) {
      return false;
    }
    
    const validSizes = ['Small', 'Medium', 'Large', 'Capital'];
    const validCategories = ['Fighter', 'Transport', 'Industrial', 'Medical'];
    
    if (!validSizes.includes(ship.size) || !validCategories.includes(ship.category)) {
      return false;
    }
  }
  
  return true;
};

// Validation schema for mission template personnel roster
const validatePersonnelRoster = (personnelRoster: any[]) => {
  if (!Array.isArray(personnelRoster)) return false;
  
  for (const personnel of personnelRoster) {
    if (!personnel.profession || typeof personnel.count !== 'number' || personnel.count < 0) {
      return false;
    }
    
    const validProfessions = ['Pilot', 'Gunner', 'Medic', 'Infantry', 'Engineer'];
    
    if (!validProfessions.includes(personnel.profession)) {
      return false;
    }
  }
  
  return true;
};

// Validation for mission template data
const validateMissionTemplateData = (data: any) => {
  if (!data.name || typeof data.name !== 'string' || data.name.length < 3) {
    return { valid: false, error: 'Name must be at least 3 characters' };
  }

  if (!data.operationType) {
    return { valid: false, error: 'Operation type is required' };
  }

  const validOperationTypes: OperationType[] = ['Ground Operations', 'Space Operations'];
  if (!validOperationTypes.includes(data.operationType)) {
    return { valid: false, error: 'Invalid operation type' };
  }

  if (!data.primaryActivity) {
    return { valid: false, error: 'Primary activity is required' };
  }

  const validActivities: ActivityType[] = ['Mining', 'Salvage', 'Escort', 'Transport', 'Medical', 'Combat'];
  if (!validActivities.includes(data.primaryActivity)) {
    return { valid: false, error: 'Invalid primary activity' };
  }

  // Validate secondary activity if provided
  if (data.secondaryActivity && !validActivities.includes(data.secondaryActivity)) {
    return { valid: false, error: 'Invalid secondary activity' };
  }

  // Validate tertiary activity if provided
  if (data.tertiaryActivity && !validActivities.includes(data.tertiaryActivity)) {
    return { valid: false, error: 'Invalid tertiary activity' };
  }

  // Validate ship roster if provided
  if (data.shipRoster && !validateShipRoster(data.shipRoster)) {
    return { valid: false, error: 'Invalid ship roster data' };
  }

  // Validate personnel roster if provided
  if (data.personnelRoster && !validatePersonnelRoster(data.personnelRoster)) {
    return { valid: false, error: 'Invalid personnel roster data' };
  }

  // Validate required equipment if provided
  if (data.requiredEquipment && typeof data.requiredEquipment !== 'string') {
    return { valid: false, error: 'Required equipment must be a string' };
  }

  return { valid: true };
};

// GET handler - List mission templates
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const userId = auth.userId;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters: { 
      createdBy?: string; 
      operationType?: string; 
      primaryActivity?: string;
      userId?: string;
    } = {};

    const createdBy = searchParams.get('createdBy');
    if (createdBy) filters.createdBy = createdBy;

    const operationType = searchParams.get('operationType');
    if (operationType) filters.operationType = operationType;

    const primaryActivity = searchParams.get('primaryActivity');
    if (primaryActivity) filters.primaryActivity = primaryActivity;

    // Always filter by user for security
    filters.userId = userId;

    console.log('Fetching mission templates with filters:', filters);

    // Get mission templates using the mission-template-storage module
    const templates = await missionTemplateStorage.getAllMissionTemplates(filters);

    console.log(`Returning ${templates.length} mission templates`);

    // Basic pagination at API layer
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSizeRaw = parseInt(searchParams.get('pageSize') || '50', 10);
    const pageSize = Math.min(200, Math.max(1, pageSizeRaw));
    const start = (page - 1) * pageSize;
    const paged = templates.slice(start, start + pageSize);

    const res = NextResponse.json({
      items: paged,
      page,
      pageSize,
      total: templates.length,
      totalPages: Math.ceil(templates.length / pageSize) || 1,
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;

  } catch (error) {
    console.error('Error fetching mission templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mission templates' },
      { status: 500 }
    );
  }
}

// POST handler - Create a new mission template
export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const userId = auth.userId;

    // Parse request body
    const templateData = await request.json();

    // Basic validation
    const validation = validateMissionTemplateData(templateData);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Ensure the template is created by the current user
    const templateToCreate = {
      ...templateData,
      createdBy: userId
    };

    try {
      // Create mission template using the mission-template-storage module
      const template = await missionTemplateStorage.createMissionTemplate(templateToCreate);
      console.log('Mission template created successfully:', template.id);
      return NextResponse.json(template, { status: 201 });
    } catch (storageError) {
      console.error('Error in mission template storage layer:', storageError);

      return NextResponse.json(
        { error: 'Failed to create mission template' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating mission template:', error);

    return NextResponse.json(
      { error: 'Failed to create mission template' },
      { status: 500 }
    );
  }
}

// PUT handler - Update an existing mission template
export async function PUT(request: NextRequest) {
  try {
    // Check authorization
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const userId = auth.userId;

    // Parse request body
    const templateData = await request.json();

    // Basic validation
    if (!templateData || !templateData.id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    // Check if user can modify this template
    const canModify = await missionTemplateStorage.canUserModifyTemplate(userId, templateData.id);
    if (!canModify) {
      return NextResponse.json(
        { error: 'You do not have permission to modify this mission template' },
        { status: 403 }
      );
    }

    // Validate the data if it's a full update
    if (templateData.name || templateData.operationType || templateData.primaryActivity) {
      const validation = validateMissionTemplateData(templateData);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
    }

    try {
      // Update mission template using the mission-template-storage module
      const template = await missionTemplateStorage.updateMissionTemplate(templateData.id, templateData);

      if (!template) {
        return NextResponse.json(
          { error: `Mission template not found with ID: ${templateData.id}` },
          { status: 404 }
        );
      }

      console.log('Mission template updated successfully:', template.id);
      return NextResponse.json(template, { status: 200 });
    } catch (storageError) {
      console.error('Error in mission template storage layer:', storageError);

      return NextResponse.json(
        { error: 'Failed to update mission template' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating mission template:', error);

    return NextResponse.json(
      { error: 'Failed to update mission template' },
      { status: 500 }
    );
  }
}

// DELETE handler - Delete a mission template
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const userId = auth.userId;

    // Parse template ID from URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Mission template ID is required' }, { status: 400 });
    }

    // Check if user can delete this template
    const canDelete = await missionTemplateStorage.canUserDeleteTemplate(userId, id);
    if (!canDelete) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this mission template' },
        { status: 403 }
      );
    }

    console.log('Deleting mission template:', id);

    // Delete mission template using the mission-template-storage module
    const success = await missionTemplateStorage.deleteMissionTemplate(id);

    if (!success) {
      return NextResponse.json({ error: 'Mission template not found' }, { status: 404 });
    }

    console.log('Mission template deleted successfully:', id);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting mission template:', error);

    return NextResponse.json(
      { error: 'Failed to delete mission template' },
      { status: 500 }
    );
  }
}