import { CodeNode } from './CodeNode'
import { ConditionalNode } from './ConditionalNode'
import { GenerateNode } from './GenerateNode'
import { GenTextToVideoNode } from './GenTextToVideoNode'
import { GenImageToVideoNode } from './GenImageToVideoNode'
import { GenVideoToVideoNode } from './GenVideoToVideoNode'
import { GenImagesToVideoNode } from './GenImagesToVideoNode'
import { GenImageNode } from './GenImageNode'
import { InputNode } from './InputNode'
import { OutputNode } from './OutputNode'
import { ProcessNode } from './ProcessNode'
import { AssetNode } from './AssetNode'
import { VideoInputNode } from './VideoInputNode'
import { PromptNode } from './PromptNode'
import { RerouteNode } from './RerouteNode'
import { JsonViewerNode } from './JsonViewerNode'
import { ImageReferenceNode } from './ImageReferenceNode'
import { VideoReferenceNode } from './VideoReferenceNode'
import { UpscaleNode } from './UpscaleNode'
import { VideoExtendNode } from './VideoExtendNode'
import { VideoConnectorNode } from './VideoConnectorNode'

export const workflowNodeTypes = {
  input: InputNode,
  output: OutputNode,
  process: ProcessNode,
  conditional: ConditionalNode,
  code: CodeNode,
  generate: GenerateNode,
  gen_text_to_video: GenTextToVideoNode,
  gen_image_to_video: GenImageToVideoNode,
  gen_video_to_video: GenVideoToVideoNode,
  gen_images_to_video: GenImagesToVideoNode,
  gen_image: GenImageNode,
  asset: AssetNode,
  video_input: VideoInputNode,
  prompt: PromptNode,
  reroute: RerouteNode,
  json_viewer: JsonViewerNode,
  image_reference: ImageReferenceNode,
  video_reference: VideoReferenceNode,
  upscale: UpscaleNode,
  video_extend: VideoExtendNode,
  video_connector: VideoConnectorNode,
}