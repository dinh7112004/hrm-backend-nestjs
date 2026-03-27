export class CreateTaskDto {
    title: string;
    description?: string;
    assigneeId: string;
    dueDate: string;
    priority?: string;
}

export class UpdateTaskStatusDto {
    status: string; // 'TODO' | 'IN_PROGRESS' | 'COMPLETED'
}