import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import * as missionTemplateStorage from '@/lib/mission-template-storage';

// GET handler - Get a specific mission template by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const resolvedParams = await params;
    const templateId = resolvedParams.id;

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    // Check if user can access this template
    const canAccess = await missionTemplateStorage.canUserAccessTemplate(userId, templateId);
    if (!canAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to access this mission template' },
        { status: 403 }
      );
    }

    console.log('Fetching mission template:', templateId);

    // Get mission template using the mission-template-storage module
    const template = await missionTemplateStorage.getMissionTemplateById(templateId);

    if (!template) {
      return NextResponse.json({ error: 'Mission template not found' }, { status: 404 });
    }

    console.log('Mission template found:', template.name);

    const res = NextResponse.json(template);
    res.headers.set('Cache-Control', 'no-store');
    return res;

  } catch (error) {
    console.error('Error fetching mission template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mission template' },
      { status: 500 }
    );
  }
}

// PUT handler - Update a specific mission template by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const resolvedParams = await params;
    const templateId = resolvedParams.id;

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    // Check if user can modify this template
    const canModify = await missionTemplateStorage.canUserModifyTemplate(userId, templateId);
    if (!canModify) {
      return NextResponse.json(
        { error: 'You do not have permission to modify this mission template' },
        { status: 403 }
      );
    }

    // Parse request body
    const templateData = await request.json();

    console.log('Updating mission template:', templateId);

    // Update mission template using the mission-template-storage module
    const template = await missionTemplateStorage.updateMissionTemplate(templateId, templateData);

    if (!template) {
      return NextResponse.json({ error: 'Mission template not found' }, { status: 404 });
    }

    console.log('Mission template updated successfully:', template.name);

    return NextResponse.json(template, { status: 200 });

  } catch (error) {
    console.error('Error updating mission template:', error);
    return NextResponse.json(
      { error: 'Failed to update mission template' },
      { status: 500 }
    );
  }
}

// DELETE handler - Delete a specific mission template by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const resolvedParams = await params;
    const templateId = resolvedParams.id;

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    // Check if user can delete this template
    const canDelete = await missionTemplateStorage.canUserDeleteTemplate(userId, templateId);
    if (!canDelete) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this mission template' },
        { status: 403 }
      );
    }

    console.log('Deleting mission template:', templateId);

    // Delete mission template using the mission-template-storage module
    const success = await missionTemplateStorage.deleteMissionTemplate(templateId);

    if (!success) {
      return NextResponse.json({ error: 'Mission template not found' }, { status: 404 });
    }

    console.log('Mission template deleted successfully:', templateId);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting mission template:', error);
    return NextResponse.json(
      { error: 'Failed to delete mission template' },
      { status: 500 }
    );
  }
}