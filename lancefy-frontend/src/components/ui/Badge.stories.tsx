import type { Meta, StoryObj } from '@storybook/react';
import Badge from './Badge';

const meta = {
    title: 'UI/Badge',
    component: Badge,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['default', 'pending', 'in-progress', 'review', 'funded', 'released', 'refunded', 'dispute'],
        },
    },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        variant: 'default',
        children: 'Default',
    },
};

export const Pending: Story = {
    args: {
        variant: 'pending',
        children: 'Pending',
    },
};

export const InProgress: Story = {
    args: {
        variant: 'in-progress',
        children: 'In Progress',
    },
};

export const Review: Story = {
    args: {
        variant: 'review',
        children: 'Under Review',
    },
};

export const Funded: Story = {
    args: {
        variant: 'funded',
        children: 'Funded',
    },
};

export const Released: Story = {
    args: {
        variant: 'released',
        children: 'Released',
    },
};

export const Refunded: Story = {
    args: {
        variant: 'refunded',
        children: 'Refunded',
    },
};

export const Dispute: Story = {
    args: {
        variant: 'dispute',
        children: 'Dispute',
    },
};

export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-wrap gap-2">
            <Badge variant="default">Default</Badge>
            <Badge variant="pending">Pending</Badge>
            <Badge variant="in-progress">In Progress</Badge>
            <Badge variant="review">Review</Badge>
            <Badge variant="funded">Funded</Badge>
            <Badge variant="released">Released</Badge>
            <Badge variant="refunded">Refunded</Badge>
            <Badge variant="dispute">Dispute</Badge>
        </div>
    ),
};
