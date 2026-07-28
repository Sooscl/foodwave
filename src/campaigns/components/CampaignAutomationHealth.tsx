import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card';

export interface CampaignAutomationHealthProps {
  registeredActions: string[];
  registeredTriggers: string[];
}

export function CampaignAutomationHealth(props: CampaignAutomationHealthProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Automation Engine</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="font-medium">Registered Triggers</p>
          <p>{props.registeredTriggers.length}</p>
        </div>
        <div>
          <p className="font-medium">Registered Actions</p>
          <p>{props.registeredActions.length}</p>
        </div>
      </CardContent>
    </Card>
  );
}
