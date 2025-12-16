import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Users, Briefcase, Building, ArrowRight } from 'lucide-react';

const QuickActionCard = () => {
  const navigate = useNavigate();
  
  const actions = [
    {
      title: 'Post a New Job',
      description: 'Create a new job listing',
      icon: <PlusCircle className="h-5 w-5" />,
      color: 'bg-blue-100 text-blue-600',
      action: () => navigate('/admin/jobs/create')
    },
    {
      title: 'Review Applications',
      description: 'Check candidate applications',
      icon: <Users className="h-5 w-5" />,
      color: 'bg-purple-100 text-purple-600',
      action: () => navigate('/admin/jobs')
    },
    {
      title: 'Manage Jobs',
      description: 'Edit or update job listings',
      icon: <Briefcase className="h-5 w-5" />,
      color: 'bg-green-100 text-green-600',
      action: () => navigate('/admin/jobs')
    },
    {
      title: 'Manage Companies',
      description: 'Add or edit company profiles',
      icon: <Building className="h-5 w-5" />,
      color: 'bg-amber-100 text-amber-600',
      action: () => navigate('/admin/company')
    }
  ];
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Frequently used recruiter tools</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto py-4 px-4 justify-start text-left flex items-start gap-3 hover:bg-gray-50"
              onClick={action.action}
            >
              <div className={`rounded-full ${action.color} p-2 mt-1`}>
                {action.icon}
              </div>
              <div>
                <h3 className="font-medium">{action.title}</h3>
                <p className="text-sm text-gray-500">{action.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto self-center" />
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActionCard;