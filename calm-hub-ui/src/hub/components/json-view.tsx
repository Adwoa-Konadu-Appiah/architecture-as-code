import { useNavigate } from 'react-router-dom';
import { allExpanded, defaultStyles, JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { Data } from '../../model/calm.js';
import { generateArcitectureInstanceFromPattern } from '../../../../shared/src/commands/generate/generate.js'

interface JsonRendererProps {
    jsonString: Data | undefined;
}

export function JsonRenderer({ jsonString }: JsonRendererProps) {
    const defaultMessage = <div className=" text-center">Please select a document to load.</div>;
    const navigate = useNavigate();
    const jsonView = (
        <div>
            <button
                className="bg-primary hover:bg-blue-500 text-white font-bold py-2 px-4 rounded float-right"
                onClick={handleClick}
            >
                Visualize
            </button>
            <JsonView
                data={jsonString || ''}
                shouldExpandNode={allExpanded}
                style={defaultStyles}
            />
        </div>
    );
    async function handleClick() {
        if(jsonString?.dataType !== "Flow" && jsonString?.dataType !== "Pattern"){
            navigate('/visualizer', { state: jsonString });
        }
        else{
            console.log(jsonString?.data)
            const data = jsonString?.data
            if(data){
             let parsed;
             if (typeof data === 'string') {
                 parsed = JSON.parse(data);
               } else {
                 parsed = data; 
               }
             const patternArc =  await generateArcitectureInstanceFromPattern(parsed, true);
             console.log(patternArc)
             jsonString.data = JSON.parse(patternArc);
             console.log(jsonString)
             navigate('/visualizer', {state: jsonString})
            }
         }
        
    }

    const content = jsonString ? jsonView : defaultMessage;

    return <div className="p-5 flex-1 overflow-auto bg-[#eee]">{content}</div>;
}
