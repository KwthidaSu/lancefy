import type { Meta, StoryObj } from '@storybook/react';
import Avatar from './Avatar';

const meta = {
    title: 'UI/Avatar',
    component: Avatar,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg', 'xl'],
        },
    },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = {
    args: {
        alt: 'John Doe',
        size: 'sm',
    },
};

export const Medium: Story = {
    args: {
        alt: 'Jane Smith',
        size: 'md',
    },
};

export const Large: Story = {
    args: {
        alt: 'Bob Wilson',
        size: 'lg',
    },
};

export const ExtraLarge: Story = {
    args: {
        alt: 'Alice Johnson',
        size: 'xl',
    },
};

export const WithImage: Story = {
    args: {
        src: 'https://i.pravatar.cc/150?img=1',
        alt: 'User Avatar',
        size: 'lg',
    },
};

export const WithFallback: Story = {
    args: {
        alt: 'Custom User',
        fallback: 'CU',
        size: 'lg',
    },
};

export const AllSizes: Story = {
    render: () => (
        <div className="flex items-center gap-4">
            <Avatar alt="User 1" size="sm" />
            <Avatar alt="User 2" size="md" />
            <Avatar alt="User 3" size="lg" />
            <Avatar alt="User 4" size="xl" />
        </div>
    ),
};
