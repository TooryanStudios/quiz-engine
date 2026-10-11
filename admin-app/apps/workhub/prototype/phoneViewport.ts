/** The visible phone screen, including Safari's keyboard-induced viewport pan. */
export function phoneViewport(layoutHeight:number, height:number, top:number, scale:number, editing:boolean){
 return {height:Math.round(height),top:Math.round(top),keyboard:editing&&scale<1.1&&layoutHeight-height>120}
}

/** Keep the pre-keyboard height when Android resizes both layout and visual viewports. */
export function phoneLayoutBaseline(previous:{width:number;height:number},width:number,height:number,editing:boolean){
 return {width,height:!editing||Math.abs(width-previous.width)>80?height:Math.max(previous.height,height)}
}
