import {
  DialogContainer,
  Dialog,
  Heading,
  Content,
  ButtonGroup,
  Button,
  Text
} from '@react-spectrum/s2';
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import { AEMWidgetRenderer } from './AEMWidgetRenderer';

interface AEMWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolName: string;
  toolId: string;
  componentUrl: string;
  toolInput: Record<string, any>;
  toolOutput?: any;
  toolResponseMetadata?: Record<string, any>;
  serverId: string;
}

export default function AEMWidgetModal({
  isOpen,
  onClose,
  toolName,
  toolId,
  componentUrl,
  toolInput,
  toolOutput,
  toolResponseMetadata,
  serverId,
}: AEMWidgetModalProps) {
  return (
    <DialogContainer onDismiss={onClose}>
      {isOpen && (
        <Dialog size="XL" isDismissible>
          {({close}) => (
            <>
              <Heading slot="title">{toolName} - AEM Widget</Heading>
              <Content styles={style({ padding: 24 })}>
                <AEMWidgetRenderer
                  componentUrl={componentUrl}
                  toolName={toolName}
                  toolId={toolId}
                  toolInput={toolInput}
                  toolOutput={toolOutput}
                  toolResponseMetadata={toolResponseMetadata}
                  serverId={serverId}
                  onClose={close}
                />
              </Content>
              <ButtonGroup>
                <Button variant="secondary" onPress={close}>
                  <Text>Close</Text>
                </Button>
              </ButtonGroup>
            </>
          )}
        </Dialog>
      )}
    </DialogContainer>
  );
}
